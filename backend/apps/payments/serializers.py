from rest_framework import serializers
from apps.users.models import SubscriptionTier
from .models import CreditPack, CreditPricing, ExchangeRate, CreditBonusRule

class SubscriptionTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionTier
        fields = ['id', 'name', 'slug', 'price', 'interval', 'credits', 'features', 'is_active']

class CreditPackSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditPack
        fields = ['id', 'name', 'credits', 'price', 'description', 'is_active']

class PaymentTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import PaymentTransaction
        model = PaymentTransaction
        fields = ['id', 'provider_transaction_id', 'amount_usd', 'amount_uzs', 'currency', 'transaction_type', 'status', 'metadata', 'created_at']

class CreditPricingSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditPricing
        fields = ['price_per_credit_usd']

class ExchangeRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExchangeRate
        fields = ['usd_to_uzs']

class CreditBonusRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditBonusRule
        fields = ['min_credits', 'bonus_credits']
