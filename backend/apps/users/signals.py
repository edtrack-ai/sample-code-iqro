import random
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from allauth.account.signals import user_signed_up
from allauth.socialaccount.models import SocialAccount
from allauth.account.models import EmailAddress
from .models import User, EmailVerificationOTP, CreditBalance, SubscriptionTier

logger = logging.getLogger(__name__)

@receiver(post_save, sender=User)
def create_user_related_objects(sender, instance, created, **kwargs):
    if created:
        # 1. Assign default Free tier if available
        free_tier = SubscriptionTier.objects.filter(slug='free').first()
        if free_tier:
            instance.tier = free_tier
            instance.save()
            
        # 2. Create credit balance for new user
        # (Start with tier's initial credits if available)
        initial_balance = free_tier.credits if free_tier else 10.00
        CreditBalance.objects.get_or_create(user=instance, defaults={'balance': initial_balance})

@receiver(user_signed_up)
def handle_user_signup(request, user, **kwargs):
    """
    Called when a user signs up (via social or regular).
    """
    social_account = SocialAccount.objects.filter(user=user).first()
    
    if social_account:
        # Social login: mark email as verified immediately
        email_address = EmailAddress.objects.filter(user=user, email=user.email).first()
        if email_address:
            email_address.verified = True
            email_address.save()
            logger.info(f"Social user verified: {user.email}")
        else:
            # If not found yet, create verified email address
            EmailAddress.objects.get_or_create(
                user=user, 
                email=user.email,
                defaults={'verified': True, 'primary': True}
            )
            logger.info(f"Created new verified EmailAddress for social user: {user.email}")
    else:
        # Regular signup: Generate and send OTP
        code = str(random.randint(100000, 999999))
        EmailVerificationOTP.objects.update_or_create(user=user, defaults={'code': code})
        
        # Send Email
        send_mail(
            subject="Iqro AI - Verification Code",
            message=f"Your verification code is: {code}\n\nPlease use this code to verify your account.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        logger.info(f"OTP sent to {user.email}: {code}")
