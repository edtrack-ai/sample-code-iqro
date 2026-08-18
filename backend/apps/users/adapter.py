from allauth.account.adapter import DefaultAccountAdapter

class CustomAccountAdapter(DefaultAccountAdapter):
    def send_confirmation_mail(self, request, emailconfirmation, signup):
        # Disable the default allauth confirmation email.
        # We handle verification via a custom OTP code sent in signals.py.
        pass
