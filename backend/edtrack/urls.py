from django.contrib import admin
from django.urls import path, include
from django.contrib.auth import logout
from dj_rest_auth.views import LoginView
from dj_rest_auth.registration.views import RegisterView
from apps.users.views import verify_email_otp

class CustomLoginView(LoginView):
    def post(self, request, *args, **kwargs):
        logout(request) # Clear session for localhost/env stability
        return super().post(request, *args, **kwargs)

class CustomRegisterView(RegisterView):
    def post(self, request, *args, **kwargs):
        logout(request) # Clear session for localhost/env stability
        return super().post(request, *args, **kwargs)

urlpatterns = [
    path('admin/', admin.site.urls),
    # Public Auth endpoints with disabled authentication classes to prevent 401 on stale tokens
    path('auth/login/', CustomLoginView.as_view(authentication_classes=[]), name='rest_login'),
    path('auth/registration/', CustomRegisterView.as_view(authentication_classes=[]), name='rest_register'),
    path('auth/verify-email/', verify_email_otp, name='rest_verify_email'),
    
    # Other auth endpoints
    path('auth/', include('dj_rest_auth.urls')),
    path('auth/registration/', include('dj_rest_auth.registration.urls')),
    
    path('users/', include('apps.users.urls')),
    path('roadmap/', include('apps.roadmaps.urls')),
    path('payments/', include('apps.payments.urls')),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
