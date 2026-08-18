from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.facebook.views import FacebookOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from apps.users.models import EmailVerificationOTP
from apps.users.serializers import VerifyOTPSerializer, UserProfileSerializer
from allauth.account.models import EmailAddress
import os

User = get_user_model()

@api_view(['GET', 'PATCH', 'PUT'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    user = request.user
    if request.method in ['PATCH', 'PUT']:
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        if first_name is not None:
            user.first_name = first_name.strip()
        if last_name is not None:
            user.last_name = last_name.strip()
        user.save(update_fields=['first_name', 'last_name'])

    timezone = request.query_params.get('timezone')
    if timezone and user.timezone != timezone:
        user.timezone = timezone
        user.save(update_fields=['timezone'])
            
    serializer = UserProfileSerializer(user)
    return Response(serializer.data)

class GoogleLogin(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    client_class = OAuth2Client

    @property
    def callback_url(self):
        # Prefer the .env variable if set
        env_callback = os.getenv("GOOGLE_OAUTH_CALLBACK_URL")
        if env_callback:
            return env_callback
        
        # Fallback for production: build from current request if on iqro.online or edtrack.org
        request = self.request
        if request and ('iqro.online' in request.get_host() or 'edtrack.org' in request.get_host()):
            return "https://iqro.online/auth/callback/google"
            
        # Local development fallback
        return "http://localhost:5173/auth/callback/google"

class FacebookLogin(SocialLoginView):
    adapter_class = FacebookOAuth2Adapter

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email_otp(request):
    serializer = VerifyOTPSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        code = serializer.validated_data['code']
        
        try:
            otp = EmailVerificationOTP.objects.get(user__email=email, code=code)
            user = otp.user
            
            # Mark email as verified in allauth
            email_address, created = EmailAddress.objects.get_or_create(user=user, email=email)
            email_address.verified = True
            email_address.save()
            
            # Delete OTP after successful verification
            otp.delete()
            
            return Response({'detail': 'Email verified successfully.'}, status=status.HTTP_200_OK)
        except EmailVerificationOTP.DoesNotExist:
            return Response({'detail': 'Invalid or expired OTP.'}, status=status.HTTP_400_BAD_REQUEST)
            
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
