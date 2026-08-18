from django.contrib.auth.models import AbstractUser
from django.db import models

class SubscriptionTier(models.Model):
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(unique=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    interval = models.CharField(max_length=20, choices=[('month', 'Monthly'), ('year', 'Yearly')], default='month')
    credits = models.IntegerField(default=0) # Credits yielded upon purchase/renewal
    is_active = models.BooleanField(default=True)
    features = models.JSONField(default=list) # Structured list of plan benefits
    credit_discount_percent = models.IntegerField(default=0) # Percentage discount for buying credits

    def __str__(self):
        return self.name

class User(AbstractUser):
    tier = models.ForeignKey(
        SubscriptionTier, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    timezone = models.CharField(max_length=100, default='UTC')
    creator_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    def __str__(self):
        return self.email or self.username

class CreditBalance(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='credit_balance')
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=10.00)
    last_daily_reset_date = models.DateField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.user.username}'s Balance: {self.balance}"

class CreditTransactionLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='credit_transactions')
    amount = models.DecimalField(max_digits=12, decimal_places=2)  # Negative for usage, positive for top-up
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username} | {self.amount} | {self.description}"

class EmailVerificationOTP(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='otp')
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} - {self.code}"
