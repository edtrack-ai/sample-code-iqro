import logging
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger('edtrack.auth_audit')

class UserAuditMiddleware(MiddlewareMixin):
    def process_request(self, request):
        logger.info(f"--- REQUEST START | {request.method} {request.path} ---")

    def process_response(self, request, response):
        user = getattr(request, 'user', None)
        path = request.path
        method = request.method
        
        user_id = user.id if user and user.is_authenticated else "Anonymous"
        user_email = user.email if user and user.is_authenticated else "Anonymous"
        
        auth_header = request.headers.get('Authorization', 'None')
        if auth_header != 'None':
            auth_header = auth_header[:20] + "..." # Mask for privacy but show prefix
            
        logger.info(f"AUDIT | Method: {method} | Path: {path} | User: {user_email} (ID: {user_id}) | AuthHeader: {auth_header}")
        
        return response
