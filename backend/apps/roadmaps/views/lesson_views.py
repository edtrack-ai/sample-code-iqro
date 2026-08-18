import json
import logging
from django.http import StreamingHttpResponse, JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from apps.roadmaps.models import Lesson
from apps.roadmaps.tasks import generate_lesson_content_task, generate_lesson_metadata_task
from apps.roadmaps.services.deepseek import stream_lesson_content
from .base import UserOwnershipMixin

logger = logging.getLogger(__name__)

class LessonUnlockView(UserOwnershipMixin, APIView):
    """
    Triggers background generation for a lesson content.
    """
    queryset = Lesson.objects.all()

    def post(self, request, lesson_id, *args, **kwargs):
        try:
            lesson = self.get_queryset().get(id=lesson_id)
        except Lesson.DoesNotExist:
            return Response({'detail': "Lesson not found."}, status=status.HTTP_404_NOT_FOUND)
            
        if lesson.is_unlocked and lesson.content:
            return Response({'detail': 'Lesson already unlocked.', 'status': 'ready'}, status=status.HTTP_200_OK)

        # Manual Credit Check
        cost = 3
        if request.user.credit_balance.balance < cost:
            return Response({
                "detail": f"Insufficient credits. Requires {cost} credits.",
                "code": "insufficient_credits"
            }, status=status.HTTP_402_PAYMENT_REQUIRED)

        generate_lesson_content_task.delay(lesson.id)
        
        return Response({
            'detail': 'Content generation started.',
            'lesson_id': lesson.id,
            'status': 'generating'
        }, status=status.HTTP_202_ACCEPTED)

class LessonSetModeView(UserOwnershipMixin, APIView):
    """
    Sets the mode for a lesson and triggers metadata regeneration.
    """
    queryset = Lesson.objects.all()

    def post(self, request, lesson_id, *args, **kwargs):
        mode = request.data.get('mode')
        if mode not in [m[0] for m in Lesson.MODE_CHOICES]:
            return Response({'detail': "Invalid mode."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            lesson = self.get_queryset().get(id=lesson_id)
        except Lesson.DoesNotExist:
            return Response({'detail': "Lesson not found."}, status=status.HTTP_404_NOT_FOUND)

        lesson.mode = mode
        lesson.save()

        generate_lesson_metadata_task.delay(lesson.id)

        return Response({
            'detail': f'Mode set to {mode}.',
            'lesson_id': lesson.id,
            'mode': mode
        }, status=status.HTTP_202_ACCEPTED)

class LessonContentStreamView(UserOwnershipMixin, APIView):
    """
    SSE stream for lesson content. 
    Allows JWT token via query parameter for EventSource compatibility.
    """
    permission_classes = []  # Manually enforced in get()
    queryset = Lesson.objects.all()

    def get(self, request, lesson_id, *args, **kwargs):
        user = request.user
        if user.is_anonymous:
            token = request.GET.get('token')
            if token:
                from rest_framework_simplejwt.authentication import JWTAuthentication
                from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
                try:
                    validated_token = JWTAuthentication().get_validated_token(token)
                    user = JWTAuthentication().get_user(validated_token)
                    request.user = user
                except (InvalidToken, AuthenticationFailed):
                    return JsonResponse({'detail': "Invalid token."}, status=401)
            else:
                return JsonResponse({'detail': "Authentication credentials were not provided."}, status=401)

        try:
            # Strict ownership check
            lesson = self.get_queryset().get(id=lesson_id)
        except Lesson.DoesNotExist:
            return JsonResponse({'detail': "Lesson not found."}, status=404)

        if lesson.content:
            def stream_existing():
                yield ": heartbeat\n\n"
                yield f"event: chunk\ndata: {json.dumps({'content': lesson.content})}\n\n"
                yield "event: done\ndata: {}\n\n"
            
            response = StreamingHttpResponse(stream_existing(), content_type='text/event-stream')
            response['Cache-Control'] = 'no-cache'
            response['X-Accel-Buffering'] = 'no'
            return response

        # Credit check for fresh generation
        if request.user.credit_balance.balance < 1:
            return JsonResponse({
                "detail": "Insufficient credits.",
                "code": "insufficient_credits"
            }, status=402)

        def sse_wrapper():
            yield ": heartbeat\n\n"
            if lesson.roadmap.sources.exists():
                from apps.roadmaps.services.gemini_generation import stream_lesson_content_with_sources
                generator = stream_lesson_content_with_sources(
                    user=request.user,
                    lesson_id=lesson.id,
                    roadmap_topic=lesson.roadmap.topic,
                    week_title=lesson.week_title,
                    lesson_title=lesson.title,
                    lesson_description=lesson.description,
                    lesson_mode=lesson.mode,
                    sources=list(lesson.roadmap.sources.all())
                )
            else:
                generator = stream_lesson_content(
                    user=request.user,
                    lesson_id=lesson.id,
                    roadmap_topic=lesson.roadmap.topic,
                    week_title=lesson.week_title,
                    lesson_title=lesson.title,
                    lesson_description=lesson.description,
                    lesson_mode=lesson.mode
                )
            for event, payload in generator:
                yield f"event: {event}\ndata: {json.dumps(payload)}\n\n"
                if event == 'done':
                    break

        response = StreamingHttpResponse(sse_wrapper(), content_type='text/event-stream')
        response['X-Accel-Buffering'] = 'no'
        response['Cache-Control'] = 'no-cache'
        return response
