import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from .models import Roadmap

logger = logging.getLogger(__name__)

class LessonStreamConsumer(AsyncWebsocketConsumer):
    async def safe_send(self, text_data=None, bytes_data=None):
        try:
            await self.send(text_data=text_data, bytes_data=bytes_data)
        except Exception as e:
            logger.debug(f"WebSocket send suppressed (client disconnected): {e}")

    async def connect(self):
        self.lesson_id = self.scope['url_route']['kwargs']['lesson_id']
        
        # 1. Acknowledge the handshake immediately to prevent browser "Handshake Error"
        subprotocol = None
        if self.scope.get('subprotocols'):
            subprotocol = self.scope['subprotocols'][0]
        await self.accept(subprotocol=subprotocol)

        logger.info(f"\n--- WS CONNECT: {self.scope['path']}?{self.scope.get('query_string', b'').decode('utf-8')} ---")
        
        # 2. Authenticate and check ownership after accepting
        user = self.scope.get('user')
        if not user or user.is_anonymous:
            logger.info("WS DEBUG: User is anonymous or auth failed. Closing.")
            await self.safe_send(text_data=json.dumps({'event': 'error', 'payload': {'message': 'Unauthorized'}}))
            await self.close()
            return
        
        logger.info(f"WS DEBUG: Auth success: {user}")
        
        # Verify ownership
        from channels.db import database_sync_to_async
        from apps.roadmaps.models import Lesson
        from apps.roadmaps.services.security import verify_ownership

        @database_sync_to_async
        def get_lesson_and_verify(l_id, u):
            try:
                l = Lesson.objects.select_related('roadmap').get(id=l_id)
                owner_id = l.roadmap.user_id
                logger.info(f"WS PERM DEBUG: User ID={u.id}, Lesson ID={l_id}, Owner ID={owner_id}")
                
                is_owner = verify_ownership(u, l)
                if not is_owner:
                    logger.warning(f"WS PERM FAIL: User {u.id} is NOT the owner of Lesson {l_id}")
                return l if is_owner else None
            except Exception as e:
                logger.error(f"WS PERM ERR: {str(e)}")
                return None

        lesson = await get_lesson_and_verify(self.lesson_id, user)
        if not lesson:
            await self.safe_send(text_data=json.dumps({'event': 'error', 'payload': {'message': 'Permission denied'}}))
            await self.close()
            return

        self.room_group_name = f'lesson_{self.lesson_id}'
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        logger.info(f"WebSocket joined group: {self.room_group_name}")

        # Send existing content if available
        from channels.db import database_sync_to_async
        from apps.roadmaps.models import Lesson
        
        @database_sync_to_async
        def get_lesson_data(l_id):
            try:
                l = Lesson.objects.select_related('roadmap__user__credit_balance').get(id=l_id)
                balance = l.roadmap.user.credit_balance.balance if hasattr(l.roadmap.user, 'credit_balance') else 0
                return {
                    'content': l.content,
                    'metadata': l.playground_metadata,
                    'is_unlocked': l.is_unlocked,
                    'balance': float(balance)
                }
            except Lesson.DoesNotExist:
                return None

        lesson_data = await get_lesson_data(self.lesson_id)
        if lesson_data and lesson_data['content']:
            await self.safe_send(text_data=json.dumps({
                'event': 'content_ready',
                'payload': {'content': lesson_data['content']},
                'remaining_credits': float(lesson_data['balance'])
            }))
        if lesson_data and lesson_data['metadata']:
            await self.safe_send(text_data=json.dumps({
                'event': 'metadata_ready',
                'payload': lesson_data['metadata'],
                'remaining_credits': float(lesson_data['balance'])
            }))

    async def disconnect(self, close_code):
        # Leave room group
        if hasattr(self, 'room_group_name') and self.room_group_name:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            logger.info(f"WebSocket disconnected from {self.room_group_name}")

    # Receive message from WebSocket (frontend to backend - if needed)
    async def receive(self, text_data):
        pass # We only stream FROM backend TO frontend for now.

    # Receive message from room group (triggered by Celery/Signals)
    async def lesson_content_chunk(self, event):
        chunk = event['chunk']
        # Send chunk to WebSocket
        await self.safe_send(text_data=json.dumps({
            'event': 'chunk',
            'chunk': chunk
        }))

    async def lesson_content_ready(self, event):
        """Broadcasts full content (markdown) when AI finishes."""
        payload = event['payload']
        await self.safe_send(text_data=json.dumps({
            'event': 'content_ready',
            'payload': payload
        }))

    async def lesson_metadata_ready(self, event):
        """Broadcasts full metadata (playground/quiz) when AI finishes."""
        payload = event['payload']
        await self.safe_send(text_data=json.dumps({
            'event': 'metadata_ready',
            'payload': payload
        }))

    async def lesson_event(self, event):
        """Unified handler for streaming chunks, errors, and completion."""
        await self.safe_send(text_data=json.dumps({
            'event': event['event'],
            'payload': event['payload'],
            'remaining_credits': float(event.get('remaining_credits', 0))
        }))

class RoadmapConsumer(AsyncWebsocketConsumer):
    async def safe_send(self, text_data=None, bytes_data=None):
        try:
            await self.send(text_data=text_data, bytes_data=bytes_data)
        except Exception as e:
            logger.debug(f"WebSocket send suppressed (client disconnected): {e}")

    async def connect(self):
        self.roadmap_id = self.scope['url_route']['kwargs']['roadmap_id']
        
        # 1. Acknowledge the handshake immediately to prevent browser "Handshake Error"
        subprotocol = None
        if self.scope.get('subprotocols'):
            subprotocol = self.scope['subprotocols'][0]
        await self.accept(subprotocol=subprotocol)

        logger.info(f"\n--- WS CONNECT: {self.scope['path']}?{self.scope.get('query_string', b'').decode('utf-8')} ---")

        # 2. Authenticate and check ownership after accepting
        user = self.scope.get('user')
        if not user or user.is_anonymous:
            logger.info("WS DEBUG: User is anonymous or auth failed. Closing.")
            await self.safe_send(text_data=json.dumps({'event': 'error', 'payload': {'message': 'Unauthorized'}}))
            await self.close()
            return
            
        logger.info(f"WS DEBUG: auth succeeded for user={user}")

        # Verify ownership
        from channels.db import database_sync_to_async
        from apps.roadmaps.models import Roadmap
        from apps.roadmaps.services.security import verify_ownership

        @database_sync_to_async
        def get_roadmap_and_verify(r_id, u):
            try:
                r = Roadmap.objects.get(id=r_id)
                owner_id = r.user_id
                logger.info(f"WS PERM DEBUG: User ID={u.id}, Roadmap ID={r_id}, Owner ID={owner_id}")
                
                is_owner = verify_ownership(u, r)
                if not is_owner:
                    logger.warning(f"WS PERM FAIL: User {u.id} is NOT the owner of Roadmap {r_id}")
                return r if is_owner else None
            except Exception as e:
                logger.error(f"WS PERM ERR: {str(e)}")
                return None

        roadmap = await get_roadmap_and_verify(self.roadmap_id, user)
        if not roadmap:
            await self.safe_send(text_data=json.dumps({'event': 'error', 'payload': {'message': 'Permission denied'}}))
            await self.close()
            return

        self.room_group_name = f'roadmap_{self.roadmap_id}'
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        logger.info(f"WebSocket joined group: {self.room_group_name}")

        # Send initial status
        roadmap = await sync_to_async(Roadmap.objects.filter(id=self.roadmap_id).select_related('user__credit_balance').first)()
        if roadmap:
            balance = roadmap.user.credit_balance.balance if hasattr(roadmap.user, 'credit_balance') else 0
            
            # Serialize the data synchronously to prevent SynchronousOnlyOperation
            from .serializers import RoadmapListSerializer
            @database_sync_to_async
            def get_serialized_roadmap(r):
                try:
                    return RoadmapListSerializer(r).data
                except Exception as e:
                    logger.error(f"WS DEBUG: Serialization failed: {str(e)}", exc_info=True)
                    return None
            
            payload = await get_serialized_roadmap(roadmap)
            if payload:
                payload.update({
                    'event': 'progress',
                    'remaining_credits': float(balance)
                })
                logger.info(f"WS DEBUG: Sending initial progress for roadmap {self.roadmap_id}")
                await self.safe_send(text_data=json.dumps(payload))
            else:
                logger.error(f"WS DEBUG: Payload is None for roadmap {self.roadmap_id}")
        else:
            logger.error(f"WS DEBUG: Roadmap {self.roadmap_id} not found in connect.")

    async def disconnect(self, close_code):
        # Leave room group
        if hasattr(self, 'room_group_name') and self.room_group_name:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            logger.info(f"WebSocket disconnected from {self.room_group_name}")

    async def roadmap_progress(self, event):
        """Broadcasts incremental progress (total vs generated)."""
        # Ensure we send the full payload (including lessons) to the frontend
        data = event.copy()
        data.pop('type', None)
        if 'event' not in data:
            data['event'] = 'progress'
            
        await self.safe_send(text_data=json.dumps(data))
