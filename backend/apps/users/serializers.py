from rest_framework import serializers
from dj_rest_auth.registration.serializers import RegisterSerializer
from apps.users.models import EmailVerificationOTP

class CustomRegisterSerializer(RegisterSerializer):
    full_name = serializers.CharField(required=True)

    def get_cleaned_data(self):
        data = super().get_cleaned_data()
        data['full_name'] = self.validated_data.get('full_name', '')
        return data

    def save(self, request):
        user = super().save(request)
        full_name = self.cleaned_data.get('full_name', '')
        
        # Split full name into first and last name
        if full_name:
            parts = full_name.split(' ', 1)
            user.first_name = parts[0]
            if len(parts) > 1:
                user.last_name = parts[1]
            user.save()
            
        return user

class UserProfileSerializer(serializers.ModelSerializer):
    credit_balance = serializers.SerializerMethodField()
    plan = serializers.SerializerMethodField()
    plan_features = serializers.SerializerMethodField()

    class Meta:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'username', 'credit_balance', 'plan', 'plan_features', 'date_joined']

    def get_credit_balance(self, obj):
        if hasattr(obj, 'credit_balance'):
            return obj.credit_balance.balance
        return 0

    def get_plan(self, obj):
        if obj.tier:
            return obj.tier.name
        return "Free"

    def get_plan_features(self, obj):
        if obj.tier:
            return obj.tier.features
        return []

class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6, min_length=6)
