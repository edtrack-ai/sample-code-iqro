from .views import (
    SubscriptionTierListView,
    CreditPackListView,
    TransactionHistoryView, CreatePaymentView, atmos_callback,
    PaymentConfigView
)
from django.urls import path

urlpatterns = [
    path('tiers/', SubscriptionTierListView.as_view(), name='tier_list'),
    path('packs/', CreditPackListView.as_view(), name='pack_list'),
    path('history/', TransactionHistoryView.as_view(), name='transaction_history'),
    path('create-payment/', CreatePaymentView.as_view(), name='create-payment'),
    path('atmos-callback/', atmos_callback, name='atmos-callback'),
    path('config/', PaymentConfigView.as_view(), name='payment-config'),
]
