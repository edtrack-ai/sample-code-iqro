import logging
import traceback
from celery import shared_task
from django.db import transaction
from django.contrib.auth import get_user_model
from apps.roadmaps.models import Roadmap, Lesson, Flashcard
from apps.roadmaps.services.deepseek import (
    generate_roadmap_json, generate_next_lessons_json,
    generate_lesson_content_json, extract_lesson_metadata
)
from apps.users.models import CreditBalance, CreditTransactionLog, User, SubscriptionTier
from apps.users.utils import deduct_credits_by_tokens
from asgiref.sync import async_to_sync, sync_to_async
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)
User = get_user_model()

@shared_task
def generate_roadmap_task(roadmap_id):
    """
    Step 1: Generate initial roadmap struct (first 5 lessons) and total count.
    """
    logger.info(f"!!! WORKER: generate_roadmap_task for {roadmap_id} started !!!")
    channel_layer = get_channel_layer()
    
    async def broadcast_status(roadmap_obj, status_override=None):
        from apps.users.models import CreditBalance
        balance_obj = await sync_to_async(CreditBalance.objects.get)(user_id=roadmap_obj.user_id)
        from apps.roadmaps.serializers import RoadmapListSerializer
        # Run serialization in sync context to avoid DB access issues in async
        data = await sync_to_async(lambda: RoadmapListSerializer(roadmap_obj).data)()
        data.update({
            'type': 'roadmap_progress',
            'status': status_override or roadmap_obj.status,
            'remaining_credits': float(balance_obj.balance)
        })
        await channel_layer.group_send(f'roadmap_{roadmap_id}', data)

    try:
        # Fetch roadmap with user to ensure ownership context is available
        roadmap = Roadmap.objects.select_related('user').get(id=roadmap_id)
        
        # 1. Analyzing
        async_to_sync(broadcast_status)(roadmap, "analyzing")
        
        # Fetch High-Level Schema (use Gemini with sources if available, otherwise DeepSeek)
        if roadmap.sources.exists():
            from apps.roadmaps.services.gemini_generation import generate_roadmap_with_sources
            
            # Clean generic fallback topic names so Gemini is not steered by placeholder/empty topics
            cleaned_topic = roadmap.topic
            if cleaned_topic.startswith("Roadmap from ") or cleaned_topic in ["shundan roadmap yarat", "shu yerdan roadmap yarat", "yarat"]:
                cleaned_topic = ""
                
            response_data, tokens = generate_roadmap_with_sources(cleaned_topic, list(roadmap.sources.all()))
        else:
            response_data, tokens = generate_roadmap_json(roadmap.topic)
        
        if not isinstance(response_data, dict):
            response_data = {}

        # Check for AI refusal/error
        if response_data.get('error'):
            error_msg = response_data['error']
            logger.warning(f"AI Refused Roadmap for {roadmap_id}: {error_msg}")
            roadmap.status = 'failed'
            roadmap.last_error = error_msg
            roadmap.save()
            async_to_sync(broadcast_status)(roadmap)
            return

        roadmap_data = response_data.get('roadmap')
        if not roadmap_data or not isinstance(roadmap_data, dict):
            if isinstance(response_data, dict) and ('weeks' in response_data or 'topic' in response_data):
                roadmap_data = response_data
            else:
                roadmap_data = {}
        
        # 2. Planning
        async_to_sync(broadcast_status)(roadmap, "planning")
        
        # 3. Saving
        async_to_sync(broadcast_status)(roadmap, "saving")
        with transaction.atomic():
            ai_topic = roadmap_data.get('topic')
            if ai_topic:
                roadmap.topic = ai_topic
            roadmap.total_estimated_hours = roadmap_data.get('total_estimated_hours', 0.0)
            roadmap.difficulty = roadmap_data.get('difficulty', '')
            roadmap.total_lessons_count = roadmap_data.get('total_lessons_count', 0)
            
            created_count = 0
            for week in roadmap_data.get('weeks', []):
                week_num = week.get('week_number')
                week_title = week.get('title', '')
                
                for idx, lesson_data in enumerate(week.get('lessons', [])):
                    day_num = lesson_data.get('day')
                    mode = roadmap.selected_mode or lesson_data.get('mode', 'GENERAL')
                    
                    Lesson.objects.update_or_create(
                        roadmap=roadmap,
                        week_number=week_num,
                        day_number=day_num,
                        order_in_day=idx + 1,
                        defaults={
                            'week_title': week_title,
                            'title': lesson_data.get('title'),
                            'mode': mode,
                            'duration': lesson_data.get('duration', ''),
                            'description': lesson_data.get('description', ''),
                            'content': "",
                        }
                    )
                    created_count += 1
            
            roadmap.generated_lessons_count = created_count
            roadmap.status = 'ready'
            roadmap.save()

        # BROADCAST READY
        async_to_sync(broadcast_status)(roadmap)
        
        deduct_credits_by_tokens(
            user=roadmap.user,
            total_tokens=tokens,
            description=f"Roadmap Initiation: {roadmap.topic}"
        )

    except Roadmap.DoesNotExist:
        logger.error(f"Roadmap {roadmap_id} not found.")
    except Exception as e:
        error_msg = traceback.format_exc()
        logger.exception(f"Error initiating roadmap {roadmap_id}: {e}")
        Roadmap.objects.filter(id=roadmap_id).update(status='failed', last_error=error_msg)
        # Broadcast FAILED
        try:
            r = Roadmap.objects.get(id=roadmap_id)
            async_to_sync(broadcast_status)(r)
        except:
            pass

@shared_task
def continue_roadmap_generation_task(roadmap_id):
    """
    Generate the next batch of 5 lessons.
    """
    logger.error(f"!!! WORKER: continue_roadmap_generation_task for {roadmap_id} started !!!")
    channel_layer = get_channel_layer()

    async def broadcast_status(roadmap_obj, status_override=None):
        from apps.users.models import CreditBalance
        balance_obj = await sync_to_async(CreditBalance.objects.get)(user_id=roadmap_obj.user_id)
        from apps.roadmaps.serializers import RoadmapListSerializer
        # Run serialization in sync context to avoid DB access issues in async
        data = await sync_to_async(lambda: RoadmapListSerializer(roadmap_obj).data)()
        data.update({
            'type': 'roadmap_progress',
            'status': status_override or roadmap_obj.status, # Changed from hardcoded 'generating'
            'remaining_credits': float(balance_obj.balance)
        })
        await channel_layer.group_send(f'roadmap_{roadmap_id}', data)

    try:
        roadmap = Roadmap.objects.get(id=roadmap_id)
        
        # 1. Analyzing
        async_to_sync(broadcast_status)(roadmap, "analyzing")

        # Summarize existing lessons to provide context
        existing = Lesson.objects.filter(roadmap=roadmap).order_by('week_number', 'day_number', 'order_in_day')
        summary = "\n".join([f"L{i+1}: {l.title} ({l.description})" for i, l in enumerate(existing)])

        # 2. Planning (AI call)
        response_data, tokens = generate_next_lessons_json(
            topic=roadmap.topic,
            existing_lessons_summary=summary,
            current_count=roadmap.generated_lessons_count
        )
        
        # Check for AI refusal/error
        if response_data.get('error'):
            error_msg = response_data['error']
            logger.warning(f"AI Refused Roadmap Expansion for {roadmap_id}: {error_msg}")
            roadmap.status = 'ready' # Reset to ready? Or failed? 
            # In expansion, failed might be too harsh if we already have some lessons.
            # But we should probably stop and log it.
            roadmap.last_error = error_msg
            roadmap.save()
            async_to_sync(broadcast_status)(roadmap, "ready")
            return

        roadmap_data = response_data.get('roadmap', {})
        async_to_sync(broadcast_status)(roadmap, "planning")

        # 3. Saving
        async_to_sync(broadcast_status)(roadmap, "saving")
        with transaction.atomic():
            created_count = 0
            for week in roadmap_data.get('weeks', []):
                week_num = week.get('week_number')
                week_title = week.get('title', '')
                for idx, lesson_data in enumerate(week.get('lessons', [])):
                    mode = roadmap.selected_mode or lesson_data.get('mode', 'GENERAL')
                    Lesson.objects.update_or_create(
                        roadmap=roadmap,
                        week_number=week_num,
                        day_number=lesson_data.get('day'),
                        order_in_day=idx + 1,
                        defaults={
                            'week_title': week_title,
                            'title': lesson_data.get('title'),
                            'mode': mode,
                            'description': lesson_data.get('description', ''),
                        }
                    )
                    created_count += 1
            
            # Sync generated count with actual DB count (avoids drift from update_or_create)
            actual_count = Lesson.objects.filter(roadmap=roadmap).count()
            roadmap.generated_lessons_count = actual_count
            roadmap.status = 'ready' # Reset to ready after batch
            roadmap.save()

        # BROADCAST UPDATE
        async_to_sync(broadcast_status)(roadmap)
        
        deduct_credits_by_tokens(
            user=roadmap.user,
            total_tokens=tokens,
            description=f"Roadmap Expansion: {roadmap.topic}"
        )

    except Exception as e:
        logger.exception(f"Error continuing roadmap {roadmap_id}: {e}")

@shared_task
def generate_lesson_content_task(lesson_id):
    """
    Step 2.1: Generate detailed Markdown content for a single lesson.
    """
    try:
        logger.error(f"!!! TASK START: generate_lesson_content_task for {lesson_id} !!!")
        # Fetch through the ownership chain
        lesson = Lesson.objects.select_related('roadmap__user').get(id=lesson_id)
        roadmap = lesson.roadmap
        
        # 1. Use the streaming generator
        if roadmap.sources.exists():
            from apps.roadmaps.services.gemini_generation import stream_lesson_content_with_sources
            generator = stream_lesson_content_with_sources(
                user=roadmap.user,
                lesson_id=lesson.id,
                roadmap_topic=roadmap.topic,
                week_title=lesson.week_title,
                lesson_title=lesson.title,
                lesson_description=lesson.description,
                lesson_mode=lesson.mode,
                sources=list(roadmap.sources.all())
            )
        else:
            from .services.deepseek import stream_lesson_content
            generator = stream_lesson_content(
                user=roadmap.user,
                lesson_id=lesson.id,
                roadmap_topic=roadmap.topic,
                week_title=lesson.week_title,
                lesson_title=lesson.title,
                lesson_description=lesson.description,
                lesson_mode=lesson.mode
            )
        
        channel_layer = get_channel_layer()
        from apps.users.models import CreditBalance
        balance_obj = CreditBalance.objects.get(user=roadmap.user)

        accumulated_content = ""
        for event, payload in generator:
            if event == 'chunk':
                accumulated_content += payload.get('content', '')
                
            # Broadcast each chunk/event to the WebSocket group
            async_to_sync(channel_layer.group_send)(
                f'lesson_{lesson_id}',
                {
                    'type': 'lesson_event',
                    'event': event,
                    'payload': payload,
                    'remaining_credits': float(balance_obj.balance)
                }
            )

        # Save to database
        if accumulated_content:
            lesson.content = accumulated_content
            lesson.is_unlocked = True
            lesson.save()
            logger.info(f"Saved lesson {lesson_id} content ({len(accumulated_content)} chars) to database.")

        # Broadcast done event to finalize client stream UI state
        async_to_sync(channel_layer.group_send)(
            f'lesson_{lesson_id}',
            {
                'type': 'lesson_event',
                'event': 'done',
                'payload': {},
                'remaining_credits': float(balance_obj.balance)
            }
        )
            
        logger.info(f"Successfully finished streaming and saved content for lesson {lesson_id}")

    except Lesson.DoesNotExist:
        logger.error(f"Lesson {lesson_id} not found.")
    except Exception as e:
        logger.exception(f"Error generating markdown for lesson {lesson_id}: {e}")
        try:
            channel_layer = get_channel_layer()
            lesson = Lesson.objects.get(id=lesson_id)
            balance_obj = CreditBalance.objects.get(user=lesson.roadmap.user)
            
            # Re-lock lesson so user can try again
            lesson.is_unlocked = False
            lesson.save()
            
            async_to_sync(channel_layer.group_send)(
                f'lesson_{lesson_id}',
                {
                    'type': 'lesson_event',
                    'event': 'error',
                    'payload': {'detail': str(e)},
                    'remaining_credits': float(balance_obj.balance)
                }
            )
        except Exception as inner_e:
            logger.error(f"Failed to broadcast error for lesson {lesson_id}: {inner_e}")

@shared_task
def generate_lesson_metadata_task(lesson_id):
    """
    Step 2.2: Extract interactive metadata (Playground, Quiz, Flashcards) from lesson Markdown.
    """
    try:
        logger.info(f"!!! TASK START: generate_lesson_metadata_task for {lesson_id} !!!")
        # Fetch through the ownership chain
        lesson = Lesson.objects.select_related('roadmap__user').get(id=lesson_id)
        if not lesson.content:
            logger.warning(f"Lesson {lesson_id} has no content to extract metadata from.")
            return

        # 1. Call DeepSeek for metadata extraction
        metadata_resp, tokens = extract_lesson_metadata(
            lesson_content=lesson.content,
            lesson_mode=lesson.mode
        )
        
        meta = (metadata_resp or {}).get('metadata')
        if not meta:
            logger.warning(f"No valid metadata extracted for lesson {lesson_id}.")
            return
        
        # 2. Update Lesson metadata
        with transaction.atomic():
            lesson.playground_metadata = meta.get('playground')
            
            # Special handling for Language mode (Flashcards)
            if lesson.mode == 'LANGUAGE':
                flashcards_data = meta.get('flashcards', [])
                for fc in flashcards_data:
                    Flashcard.objects.get_or_create(
                        user=lesson.roadmap.user,
                        lesson=lesson,
                        front_content=fc.get('front'),
                        defaults={
                            'type': fc.get('type'),
                            'back_content': fc.get('back'),
                            'phonetic': fc.get('phonetic')
                        }
                    )
            
            lesson.save()

        # BROADCAST METADATA READY
        from .serializers import LessonSerializer
        from apps.users.models import CreditBalance
        balance_obj = CreditBalance.objects.get(user=lesson.roadmap.user)
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'lesson_{lesson_id}',
            {
                'type': 'lesson_event',
                'event': 'metadata_ready',
                'payload': LessonSerializer(lesson).data,
                'remaining_credits': float(balance_obj.balance)
            }
        )
        
        # 3. Deduct credits (Metadata extraction is cheaper)
        deduct_credits_by_tokens(
            user=lesson.roadmap.user,
            total_tokens=tokens,
            description=f"Lesson Metadata: {lesson.title}"
        )

        logger.info(f"Successfully extracted metadata for lesson {lesson_id}")

    except Lesson.DoesNotExist:
        logger.error(f"Lesson {lesson_id} not found.")
    except Exception as e:
        error_msg = traceback.format_exc()
        logger.exception(f"Error extracting metadata for lesson {lesson_id}: {e}")
        try:
            Lesson.objects.filter(id=lesson_id).update(last_error=error_msg)
            # You might want a broadcast here too, but metadata is usually secondary
        except:
            pass

@shared_task
def generate_playground_task(lesson_id):
    """
    Step 3: Generate interactive simulation (Playground) for a lesson.
    """
    from apps.roadmaps.models import Lesson
    from apps.roadmaps.services.deepseek import generate_playground_html
    from apps.users.utils import deduct_credits_by_tokens
    
    channel_layer = get_channel_layer()
    
    def broadcast_status(status_val, has_pg=False, last_error=None):
        async_to_sync(channel_layer.group_send)(
            f'lesson_{lesson_id}',
            {
                'type': 'lesson_event',
                'event': 'playground_status',
                'payload': {
                    'status': status_val,
                    'has_playground': has_pg,
                    'last_error': last_error
                }
            }
        )

    try:
        logger.info(f"!!! TASK START: generate_playground_task for {lesson_id} !!!")
        
        lesson = Lesson.objects.select_related('roadmap__user').get(id=lesson_id)
        
        # Set to generating
        lesson.playground_status = 'generating'
        lesson.save()
        broadcast_status('generating')
        
        # 1. Generate Playground HTML
        playground_code, tokens = generate_playground_html(
            lesson_title=lesson.title,
            lesson_content=lesson.content
        )
        
        if not playground_code:
            logger.warning(f"No playground code generated for lesson {lesson_id}")
            lesson.has_playground = False
            lesson.playground_status = 'failed'
            lesson.save()
            broadcast_status('failed', last_error="AI returned empty code")
            return

        # 2. Update Lesson
        with transaction.atomic():
            lesson.playground_code = playground_code
            lesson.has_playground = True
            lesson.playground_status = 'ready'
            lesson.save()

            # 3. Deduct credits
            deduct_credits_by_tokens(
                user=lesson.roadmap.user,
                total_tokens=tokens,
                description=f"Playground Generation: {lesson.title}"
            )

        # BROADCAST READY
        broadcast_status('ready', has_pg=True)
        logger.info(f"Successfully generated playground for lesson {lesson_id}")

    except Lesson.DoesNotExist:
        logger.error(f"Lesson {lesson_id} not found.")
    except Exception as e:
        error_msg = traceback.format_exc()
        logger.exception(f"Error in generate_playground_task for {lesson_id}: {e}")
        try:
            Lesson.objects.filter(id=lesson_id).update(playground_status='failed', last_error=error_msg)
            broadcast_status('failed', last_error=error_msg)
        except:
            pass

@shared_task
def reset_daily_credits():
    """
    Hourly Celery beat task to reset or grant credits daily to users based on their local timezone.
    Refills balance to exactly 10.00 if it is below 10 and they haven't been reset today.
    """
    import datetime
    from zoneinfo import ZoneInfo
    from django.utils import timezone
    from apps.users.models import CreditBalance, CreditTransactionLog
    
    now_utc = timezone.now()
    refill_count = 0
    
    balances = CreditBalance.objects.select_related('user').all()
    for balance_obj in balances:
        user = balance_obj.user
        tz_name = user.timezone or 'UTC'
        try:
            tz = ZoneInfo(tz_name)
        except Exception:
            tz = ZoneInfo('UTC')
            
        local_now = now_utc.astimezone(tz)
        local_date = local_now.date()
        local_hour = local_now.hour
        
        # Reset between 2:00 AM and 6:00 AM (local hours: 2, 3, 4, 5)
        # only if they haven't had a daily reset today
        if 2 <= local_hour < 6:
            if balance_obj.last_daily_reset_date != local_date:
                if balance_obj.balance < 10.00:
                    old_balance = balance_obj.balance
                    balance_obj.balance = 10.00
                    balance_obj.last_daily_reset_date = local_date
                    balance_obj.save(update_fields=['balance', 'last_daily_reset_date'])
                    
                    CreditTransactionLog.objects.create(
                        user=user,
                        amount=10.00 - old_balance,
                        description=f"Daily Timezone Refill: {tz_name} (local time: {local_now.strftime('%H:%M')})"
                    )
                    refill_count += 1
                else:
                    balance_obj.last_daily_reset_date = local_date
                    balance_obj.save(update_fields=['last_daily_reset_date'])
                    
    logger.info(f"Timezone-aware daily reset completed: refilled {refill_count} users.")

@shared_task
def reset_monthly_credits():
    """
    Celery beat task to reset credits for Free tier users monthly.
    """
    free_tier = SubscriptionTier.objects.filter(slug='free').first()
    if not free_tier:
        logger.warning("Free tier not found. Skipping monthly reset.")
        return

    # Find users on the free tier
    users = CreditBalance.objects.filter(user__tier=free_tier)
    count = 0
    for balance_obj in users:
        # Reset to tier's allowed credits (e.g. 10)
        balance_obj.balance = free_tier.credits
        balance_obj.save()
        
        CreditTransactionLog.objects.create(
            user=balance_obj.user,
            amount=free_tier.credits,
            description=f"Monthly Refill: {free_tier.name} Plan"
        )
        count += 1
    
    logger.info(f"Monthly credit refill completed for {count} users.")

@shared_task
def cleanup_old_chat_attachments():
    """
    Delete Chat Attachments and their physical files older than 3 days.
    """
    from apps.roadmaps.models import LessonInteractionAttachment
    from django.utils import timezone
    from datetime import timedelta
    
    threshold = timezone.now() - timedelta(days=3)
    old_attachments = LessonInteractionAttachment.objects.filter(created_at__lt=threshold)
    
    count = 0
    for attachment in old_attachments:
        try:
            if attachment.file:
                attachment.file.delete(save=False) # delete physical file
            attachment.delete() # delete DB record
            count += 1
        except Exception as e:
            logger.error(f"Failed to delete attachment {attachment.id}: {e}")
            
    logger.info(f"Cleaned up {count} old chat attachments.")
