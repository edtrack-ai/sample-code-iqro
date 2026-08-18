from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from apps.roadmaps.models import Roadmap, RoadmapSource
from apps.roadmaps.serializers import RoadmapListSerializer, RoadmapDetailSerializer, RoadmapSourceSerializer
from apps.roadmaps.tasks import generate_roadmap_task, continue_roadmap_generation_task
from apps.users.decorators import require_credits
from apps.roadmaps.services.web_parser import extract_clean_web_content
from .base import UserOwnershipMixin

class RoadmapListView(UserOwnershipMixin, generics.ListAPIView):
    """
    List all roadmaps for the authenticated user.
    """
    serializer_class = RoadmapListSerializer
    # UserOwnershipMixin handles get_queryset and permission_classes
    queryset = Roadmap.objects.prefetch_related('lessons').all()

class RoadmapDetailView(UserOwnershipMixin, generics.RetrieveAPIView):
    """
    Retrieve details of a single roadmap owned by the user.
    """
    serializer_class = RoadmapDetailSerializer
    queryset = Roadmap.objects.prefetch_related('lessons').all()

class RoadmapGenerateView(APIView):
    """
    Trigger the generation of a new roadmap, optionally utilizing custom source inputs.
    """
    permission_classes = [IsAuthenticated]

    @require_credits(cost=5)
    def post(self, request, *args, **kwargs):
        topic = request.data.get('topic')
        mode = request.data.get('mode')
        source_ids = request.data.get('source_ids', [])

        if not topic and not source_ids:
            return Response({'detail': "Please provide either a topic or select sources for your roadmap."}, status=status.HTTP_400_BAD_REQUEST)

        valid_sources = []
        if source_ids:
            try:
                valid_sources = list(RoadmapSource.objects.filter(id__in=source_ids, user=request.user))
                if len(valid_sources) != len(source_ids):
                    return Response({'detail': "Some selected sources were not found or are invalid."}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response({'detail': f"Invalid source IDs format: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        if not topic and valid_sources:
            first_src = valid_sources[0]
            if first_src.source_type == 'FILE':
                topic = f"Roadmap from {first_src.file_name}"
            elif first_src.source_type == 'URL':
                topic = f"Roadmap from {first_src.url}"
            else:
                topic = f"Roadmap from text: {first_src.text_content[:30]}..."

        roadmap = Roadmap.objects.create(
            user=request.user,
            topic=topic,
            selected_mode=mode,
            status='generating'
        )

        if valid_sources:
            roadmap.sources.set(valid_sources)

        generate_roadmap_task.delay(roadmap.id)

        serializer = RoadmapListSerializer(roadmap)
        response_data = serializer.data
        response_data['roadmap_id'] = roadmap.id

        return Response(response_data, status=status.HTTP_201_CREATED)

class RoadmapSourceUploadView(APIView):
    """
    Upload files (PDF), submit website URLs, or supply raw text as learning sources.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, *args, **kwargs):
        source_type = request.data.get('source_type')
        if source_type not in ['FILE', 'URL', 'TEXT']:
            return Response({'detail': "Invalid source type. Must be 'FILE', 'URL', or 'TEXT'."}, status=status.HTTP_400_BAD_REQUEST)

        if source_type == 'FILE':
            uploaded_file = request.FILES.get('file')
            if not uploaded_file:
                return Response({'detail': "Please upload a file."}, status=status.HTTP_400_BAD_REQUEST)
            if not uploaded_file.name.lower().endswith('.pdf'):
                return Response({'detail': "Only PDF files are supported currently."}, status=status.HTTP_400_BAD_REQUEST)
            
            source = RoadmapSource.objects.create(
                user=request.user,
                source_type='FILE',
                file=uploaded_file,
                file_name=uploaded_file.name
            )
        elif source_type == 'URL':
            url = request.data.get('url')
            if not url:
                return Response({'detail': "Please provide a website URL."}, status=status.HTTP_400_BAD_REQUEST)
            
            cleaned_text = extract_clean_web_content(url)
            if cleaned_text.startswith("Error extracting content"):
                return Response({'detail': cleaned_text}, status=status.HTTP_400_BAD_REQUEST)
                
            source = RoadmapSource.objects.create(
                user=request.user,
                source_type='URL',
                url=url,
                text_content=cleaned_text
            )
        else: # TEXT
            text_content = request.data.get('text_content')
            if not text_content:
                return Response({'detail': "Please provide text content."}, status=status.HTTP_400_BAD_REQUEST)
                
            source = RoadmapSource.objects.create(
                user=request.user,
                source_type='TEXT',
                text_content=text_content
            )

        serializer = RoadmapSourceSerializer(source)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class RoadmapSourceListView(generics.ListAPIView):
    """
    List all uploaded sources for the authenticated user.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = RoadmapSourceSerializer

    def get_queryset(self):
        return RoadmapSource.objects.filter(user=self.request.user).order_by('-created_at')

class RoadmapContinueView(UserOwnershipMixin, APIView):
    """
    Continue generating next lessons for an existing roadmap.
    """
    queryset = Roadmap.objects.all()

    @require_credits(cost=3)
    def post(self, request, roadmap_id, *args, **kwargs):
        try:
            # Use the mixin's filtered queryset to enforce ownership
            roadmap = self.get_queryset().get(id=roadmap_id)
        except Roadmap.DoesNotExist:
            return Response({'detail': "Roadmap not found."}, status=status.HTTP_404_NOT_FOUND)

        if roadmap.generated_lessons_count >= roadmap.total_lessons_count and roadmap.total_lessons_count > 0:
            return Response({'detail': "Roadmap is already complete.", 'is_complete': True}, status=status.HTTP_400_BAD_REQUEST)

        # CRITICAL: Set status to 'generating' BEFORE dispatching the task.
        # This ensures the WebSocket consumer sends the correct initial status
        # when the frontend connects, preventing it from immediately closing.
        roadmap.status = 'generating'
        roadmap.save(update_fields=['status'])

        continue_roadmap_generation_task.delay(roadmap.id)
        
        # Return the serialized roadmap object to maintain frontend state consistency
        serializer = RoadmapListSerializer(roadmap)
        response_data = serializer.data
        response_data['roadmap_id'] = roadmap.id
        return Response(response_data, status=status.HTTP_202_ACCEPTED)

class RoadmapDeleteView(UserOwnershipMixin, generics.DestroyAPIView):
    """
    Soft delete a roadmap by setting is_hidden=True.
    """
    queryset = Roadmap.objects.all()

    def perform_destroy(self, instance):
        instance.is_hidden = True
        instance.save()
