import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edtrack.settings')

# Initialize Django ASGI application early to ensure AppRegistry is ready
django_asgi_app = get_asgi_application()

# Import routing AFTER django.setup() is implicitly called by get_asgi_application()
import apps.roadmaps.routing

from channels.security.websocket import AllowedHostsOriginValidator
from apps.users.middleware_ws import JWTAuthMiddleware

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            JWTAuthMiddleware(
                URLRouter(
                    apps.roadmaps.routing.websocket_urlpatterns
                )
            )
        )
    ),
})
