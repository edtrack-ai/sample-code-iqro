import json
from django.http import StreamingHttpResponse, JsonResponse
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.roadmaps.models import Lesson, LessonInteraction, UserTaskResult, Flashcard
from apps.roadmaps.serializers import (
    LessonInteractionSerializer, UserTaskResultSerializer, FlashcardSerializer
)
from apps.roadmaps.services.deepseek import (
    generate_contextual_followup_json, stream_chat_response, generate_lesson_quiz_json
)
from apps.roadmaps.tasks import generate_lesson_metadata_task
from apps.users.decorators import require_credits
from apps.users.utils import deduct_credits_by_tokens
from .base import UserOwnershipMixin

class LessonChatStreamView(UserOwnershipMixin, APIView):
    """
    SSE stream for AI Chat interaction.
    """
    queryset = Lesson.objects.all()
    
    # Disable DRF's default content negotiation so StreamingHttpResponse works
    from rest_framework.renderers import BaseRenderer
    class PassthroughRenderer(BaseRenderer):
        media_type = 'text/event-stream'
        format = 'stream'
        def render(self, data, accepted_media_type=None, renderer_context=None):
            return data
            
    renderer_classes = [PassthroughRenderer]

    def post(self, request, lesson_id, *args, **kwargs):
        data = request.data
        selected_text = data.get('selected_text', '')
        user_query = data.get('user_query', '')
        
        if not user_query:
            return Response({'detail': 'user_query is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            lesson = self.get_queryset().get(id=lesson_id)
        except Lesson.DoesNotExist:
            return Response({'detail': "Lesson not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user.credit_balance.balance < 1:
            return Response({
                "detail": "Insufficient credits for AI chat.",
                "code": "insufficient_credits"
            }, status=status.HTTP_402_PAYMENT_REQUIRED)

        # Fetch history
        past_interactions = LessonInteraction.objects.filter(
            lesson=lesson, 
            user=request.user
        ).order_by('-created_at')[:5]

        response = StreamingHttpResponse(
            stream_chat_response(
                user=request.user,
                lesson_id=lesson.id,
                original_context=lesson.content,
                selected_text=selected_text,
                user_query=user_query,
                past_messages=list(reversed(past_interactions))
            ),
            content_type='text/event-stream'
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response

from apps.roadmaps.services.gemini_chat import GeminiChatService

class MultimodalChatAPIView(UserOwnershipMixin, APIView):
    """
    Multimodal Chat using Gemini (Text, Image, PDF, Audio).
    Returns complete JSON and handles real-time credit deduction.
    """
    queryset = Lesson.objects.all()

    def post(self, request, lesson_id, *args, **kwargs):
        message = request.data.get("user_query", "")
        selected_text = request.data.get("selected_text", "")
        files = request.FILES.getlist("files")
        
        if not message and not files:
            return Response({'detail': 'Message or files are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # File Limit Validation
        if len(files) > 5:
            return Response({'detail': 'Maximum of 5 files allowed per request.'}, status=status.HTTP_400_BAD_REQUEST)
            
        total_size = 0
        for f in files:
            file_size_mb = f.size / (1024 * 1024)
            if file_size_mb > 15:
                return Response({'detail': f'File {f.name} exceeds the 15MB size limit.'}, status=status.HTTP_400_BAD_REQUEST)
            total_size += f.size
            
        if total_size > 30 * 1024 * 1024:
            return Response({'detail': 'Total upload size exceeds the 30MB limit.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            lesson = self.get_queryset().get(id=lesson_id)
        except Lesson.DoesNotExist:
            return Response({'detail': "Lesson not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user.credit_balance.balance < 1:
            return Response({
                "detail": "Insufficient credits for AI chat.",
                "code": "insufficient_credits"
            }, status=status.HTTP_402_PAYMENT_REQUIRED)

        service = GeminiChatService()
        result = service.process_multimodal_chat(
            user=request.user, 
            lesson=lesson,
            message=message, 
            selected_text=selected_text,
            uploaded_files_list=files
        )
        
        if "error" in result and result["error"]:
            # Check if it was a safety/credit refusal
            return Response({"detail": result["error"]}, status=400)
            
        return Response({
            "interaction_id": 0, # Placeholder if needed
            "text_explanation": result["ai_response"],
            "usage_details": result["usage_details"],
            "new_balance": result["new_balance"]
        }, status=status.HTTP_200_OK)

class LessonChatHistoryView(UserOwnershipMixin, generics.ListAPIView):
    """
    List chat history for a specific lesson and user.
    """
    serializer_class = LessonInteractionSerializer
    queryset = LessonInteraction.objects.all()

    def get_queryset(self):
        # Additional filtering for lesson ID
        lesson_id = self.kwargs.get('lesson_id')
        return super().get_queryset().filter(lesson__id=lesson_id).order_by('created_at')

from .utils import update_lesson_completion

class TaskResultSubmitView(UserOwnershipMixin, APIView):
    """
    Submit result for a task or quiz.
    """
    queryset = UserTaskResult.objects.all()

    def post(self, request, lesson_id, *args, **kwargs):
        task_index = request.data.get('task_index')
        is_correct = request.data.get('is_correct', False)
        score = request.data.get('score', 0.0)
        
        try:
            # TaskResultSubmitView's queryset is UserTaskResult, so we must manually check Lesson ownership
            lesson = Lesson.objects.filter(id=lesson_id, roadmap__user=request.user).get()
        except Lesson.DoesNotExist:
            return Response({'detail': "Lesson not found."}, status=status.HTTP_404_NOT_FOUND)

        result, created = UserTaskResult.objects.update_or_create(
            user=request.user,
            lesson=lesson,
            task_index=task_index,
            defaults={'is_correct': is_correct, 'score': score}
        )
        
        # Run completion logic
        update_lesson_completion(request.user, lesson)
        
        return Response(UserTaskResultSerializer(result).data, status=status.HTTP_200_OK)

class QuizGenerateView(UserOwnershipMixin, APIView):
    """
    Generates a quiz for a lesson.
    """
    queryset = Lesson.objects.all()

    @require_credits(cost=2)
    def post(self, request, lesson_id, *args, **kwargs):
        try:
            lesson = self.get_queryset().get(id=lesson_id)
        except Lesson.DoesNotExist:
            return Response({'detail': "Lesson not found."}, status=status.HTTP_404_NOT_FOUND)

        if lesson.quiz:
            return Response({'quiz': lesson.quiz, 'is_cached': True}, status=status.HTTP_200_OK)

        try:
            quiz_data, total_tokens = generate_lesson_quiz_json(
                lesson_title=lesson.title,
                lesson_description=lesson.description,
                lesson_content=lesson.content
            )
            lesson.quiz = quiz_data
            lesson.save()
            return Response({'quiz': quiz_data, 'is_cached': False}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'detail': f"Generation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class LessonPlaygroundGenerateView(UserOwnershipMixin, APIView):
    """
    Triggers generation of the dynamic playground for a lesson.
    """
    queryset = Lesson.objects.all()

    @require_credits(cost=1)
    def post(self, request, lesson_id, *args, **kwargs):
        try:
            lesson = self.get_queryset().get(id=lesson_id)
        except Lesson.DoesNotExist:
            return Response({'detail': "Lesson not found."}, status=status.HTTP_404_NOT_FOUND)

        if lesson.playground_code or lesson.playground_status == 'generating':
            return Response({
                'has_playground': lesson.has_playground,
                'playground_status': lesson.playground_status,
                'is_cached': True
            }, status=status.HTTP_200_OK)

        from apps.roadmaps.tasks import generate_lesson_metadata_task, generate_playground_task
        generate_lesson_metadata_task.delay(lesson.id)
        generate_playground_task.delay(lesson.id)

        return Response({
            'detail': 'Playground and metadata generation started.',
            'lesson_id': lesson.id
        }, status=status.HTTP_202_ACCEPTED)

    def patch(self, request, lesson_id, *args, **kwargs):
        """
        Internal / Manual trigger for playground code generation.
        """
        try:
            lesson = self.get_queryset().get(id=lesson_id)
        except Lesson.DoesNotExist:
            return Response({'detail': "Lesson not found."}, status=status.HTTP_404_NOT_FOUND)

        from apps.roadmaps.tasks import generate_playground_task
        generate_playground_task.delay(lesson.id)

        return Response({
            'detail': 'Playground code generation task triggered.',
            'lesson_id': lesson.id,
            'status': 'processing'
        }, status=status.HTTP_202_ACCEPTED)

class FlashcardListView(UserOwnershipMixin, generics.ListAPIView):
    """
    List all flashcards for flashcard review.
    """
    serializer_class = FlashcardSerializer
    queryset = Flashcard.objects.all()

    def get_queryset(self):
        return super().get_queryset().order_by('mastery_level', 'created_at')
