from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, SubscriptionTier, CreditBalance, CreditTransactionLog

from django import forms

class SubscriptionTierForm(forms.ModelForm):
    features_text = forms.CharField(
        widget=forms.Textarea(attrs={'rows': 5, 'style': 'width: 100%;'}),
        required=False,
        help_text="Enter each feature on a new line."
    )

    class Meta:
        model = SubscriptionTier
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.features:
            self.fields['features_text'].initial = "\n".join(self.instance.features)

    def save(self, commit=True):
        features_text = self.cleaned_data.get('features_text', '')
        self.instance.features = [line.strip() for line in features_text.split('\n') if line.strip()]
        return super().save(commit=commit)

class SubscriptionTierAdmin(admin.ModelAdmin):
    form = SubscriptionTierForm
    list_display = ('name', 'price', 'interval', 'is_active')
    exclude = ('features',) # Hide the original JSON field

admin.site.register(User, UserAdmin)
admin.site.register(SubscriptionTier, SubscriptionTierAdmin)
admin.site.register(CreditBalance)
admin.site.register(CreditTransactionLog)
