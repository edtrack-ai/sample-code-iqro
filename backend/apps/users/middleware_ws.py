from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
import logging

logger = logging.getLogger('edtrack.auth_ws')

class JWTAuthMiddleware:
    """
    Custom middleware that extracts and validates a JWT token from the headers or query string.
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        # Close old connections if they were anonymous
        scope['user'] = AnonymousUser()
        
        # 1. Try to get token from query string
        query_string = scope.get('query_string', b'').decode('utf-8')
        from urllib.parse import parse_qs
        parsed_qs = parse_qs(query_string)
        token = parsed_qs.get('token', [None])[0]
        
        # 2. Try to get token from headers if not in query string
        if not token:
            headers = dict(scope.get('headers', []))
            # Standard Authorization header
            if b'authorization' in headers:
                try:
                    auth_header = headers[b'authorization'].decode('utf-8')
                    if auth_header.startswith('Bearer '):
                        token = auth_header.split(' ')[1]
                except Exception:
                    pass
            # Sec-WebSocket-Protocol header (common fallback for WS)
            if not token and b'sec-websocket-protocol' in headers:
                try:
                    # Protocols can be a comma-separated list. We pick the first one if it's our token.
                    protocol_str = headers[b'sec-websocket-protocol'].decode('utf-8')
                    if ',' in protocol_str:
                        token = protocol_str.split(',')[0].strip()
                    else:
                        token = protocol_str.strip()
                    
                    if token:
                        logger.info(f"WS AUTH: Found token in Sec-WebSocket-Protocol")
                except Exception as e:
                    logger.error(f"WS AUTH: Error parsing Sec-WebSocket-Protocol: {str(e)}")

        if token:
            try:
                user = await self.get_user(token)
                if user:
                    scope['user'] = user
                    logger.info(f"WS AUTH: Authenticated user {user.id} via token")
            except Exception as e:
                logger.error(f"WS AUTH: Error authenticating user: {str(e)}")

        return await self.app(scope, receive, send)

    @database_sync_to_async
    def get_user(self, token):
        try:
            jwt_auth = JWTAuthentication()
            validated_token = jwt_auth.get_validated_token(token)
            return jwt_auth.get_user(validated_token)
        except (InvalidToken, AuthenticationFailed) as e:
            logger.warning(f"WS AUTH: Invalid token: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"WS AUTH: Unexpected error in get_user: {str(e)}")
            return None
