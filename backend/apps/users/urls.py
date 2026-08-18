from django.urls import path
from .views import GoogleLogin, FacebookLogin, verify_email_otp, user_profile

urlpatterns = [
    path('social/google/', GoogleLogin.as_view(), name='google_login'),
    path('social/facebook/', FacebookLogin.as_view(), name='facebook_login'),
    path('verify-email/', verify_email_otp, name='verify_email_otp'),
    path('profile/', user_profile, name='user_profile'),
]
