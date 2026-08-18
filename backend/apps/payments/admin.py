from django.contrib import admin
from .models import CreditPack, PaymentTransaction, CreditPricing, ExchangeRate, CreditBonusRule

@admin.register(CreditPack)
class CreditPackAdmin(admin.ModelAdmin):
    list_display = ('name', 'credits', 'price', 'is_active')

@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'amount_usd', 'amount_uzs', 'status', 'created_at')
    list_filter = ('status', 'transaction_type')
    search_fields = ('user__email', 'provider_transaction_id')

@admin.register(CreditPricing)
class CreditPricingAdmin(admin.ModelAdmin):
    list_display = ('price_per_credit_usd', 'updated_at')

@admin.register(ExchangeRate)
class ExchangeRateAdmin(admin.ModelAdmin):
    list_display = ('usd_to_uzs', 'updated_at')

@admin.register(CreditBonusRule)
class CreditBonusRuleAdmin(admin.ModelAdmin):
    list_display = ('min_credits', 'bonus_credits', 'is_active')
