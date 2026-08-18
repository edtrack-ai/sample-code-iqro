from django.db import models
from django.conf import settings

class CreditPack(models.Model):
    name = models.CharField(max_length=100)
    credits = models.IntegerField()
    credits = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return f"{self.name} ({self.credits} Credits)"

class CreditPricing(models.Model):
    price_per_credit_usd = models.DecimalField(max_digits=10, decimal_places=4, default=1.0000)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Credit Pricing"

    def __str__(self):
        return f"Price: ${self.price_per_credit_usd} per credit"

class ExchangeRate(models.Model):
    usd_to_uzs = models.DecimalField(max_digits=10, decimal_places=2, default=12800.00)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"1 USD = {self.usd_to_uzs} UZS"

class CreditBonusRule(models.Model):
    min_credits = models.IntegerField(help_text="Minimum credits to buy to trigger this bonus")
    bonus_credits = models.IntegerField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Buy {self.min_credits}+ get {self.bonus_credits} free"

class PaymentTransaction(models.Model):
    TYPE_CHOICES = [
        ('subscription', 'Subscription'),
        ('credit_pack', 'Credit Pack'),
        ('pay_as_you_go', 'Pay As You Go'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('canceled', 'Canceled'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payment_transactions')
    provider_transaction_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    amount_usd = models.DecimalField(max_digits=10, decimal_places=2)
    amount_uzs = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=10, default='USD')
    transaction_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} | {self.amount_usd} USD | {self.status}"
