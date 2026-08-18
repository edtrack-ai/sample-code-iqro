import json
import logging
import hashlib
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.users.models import CreditBalance, CreditTransactionLog, SubscriptionTier
from .models import CreditPack, PaymentTransaction, CreditPricing, ExchangeRate, CreditBonusRule
from .atmos_service import AtmosService
from .serializers import (
    SubscriptionTierSerializer, CreditPackSerializer, PaymentTransactionSerializer,
    CreditPricingSerializer, ExchangeRateSerializer, CreditBonusRuleSerializer
)

logger = logging.getLogger(__name__)
User = get_user_model()


# ─── Read-only listing views ─────────────────────────────

class SubscriptionTierListView(generics.ListAPIView):
    queryset = SubscriptionTier.objects.filter(is_active=True)
    serializer_class = SubscriptionTierSerializer
    permission_classes = [IsAuthenticated]

class CreditPackListView(generics.ListAPIView):
    queryset = CreditPack.objects.filter(is_active=True)
    serializer_class = CreditPackSerializer
    permission_classes = [IsAuthenticated]

class TransactionHistoryView(generics.ListAPIView):
    serializer_class = PaymentTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PaymentTransaction.objects.filter(user=self.request.user).order_by('-created_at')

class PaymentConfigView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pricing = CreditPricing.objects.first()
        exchange = ExchangeRate.objects.first()
        bonuses = CreditBonusRule.objects.filter(is_active=True).order_by('min_credits')
        
        user_discount = 0
        if request.user.tier:
            user_discount = request.user.tier.credit_discount_percent

        return Response({
            'pricing': CreditPricingSerializer(pricing).data if pricing else None,
            'exchange_rate': ExchangeRateSerializer(exchange).data if exchange else None,
            'bonus_rules': CreditBonusRuleSerializer(bonuses, many=True).data,
            'user_discount_percent': user_discount
        })


from django.utils import timezone
from decimal import Decimal

class CreatePaymentView(APIView):
    """
    Mock payment endpoint for credit/tier purchases.
    Immediately credits the user balance and marks transaction as completed.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        requested_credits = request.data.get('credits')
        pack_id = request.data.get('pack_id')
        tier_id = request.data.get('tier_id')

        lang = request.headers.get('Accept-Language', 'uz').lower()
        def get_msg(key, **kwargs):
            messages = {
                'success': {
                    'uz': f"Hisobingizga {kwargs.get('credits', 0)} kredit muvaffaqiyatli qo'shildi! (Mock)",
                    'ru': f"На ваш счет успешно зачислено {kwargs.get('credits', 0)} кредитов! (Mock)",
                    'en': f"Successfully credited {kwargs.get('credits', 0)} credits! (Mock)"
                },
                'tier_success': {
                    'uz': "Obuna tarifi muvaffaqiyatli faollashtirildi! (Mock)",
                    'ru': "Тариф подписки успешно активирован! (Mock)",
                    'en': "Subscription tier activated successfully! (Mock)"
                },
                'invalid_credits': {
                    'uz': "Kredit miqdori noto'g'ri.",
                    'ru': "Некорректное количество кредитов.",
                    'en': "Invalid credit amount."
                },
                'no_product': {
                    'uz': "Mahsulot tanlanmadi.",
                    'ru': "Продукт не выбран.",
                    'en': "No product selected."
                }
            }
            msg_dict = messages.get(key, {})
            return msg_dict.get(lang, msg_dict.get('en', ''))

        try:
            total_usd = 0
            total_uzs = 0
            credits_to_add = 0
            transaction_type = 'pay_as_you_go'
            metadata = {}
            description = ""

            with transaction.atomic():
                # 1. Determine Product & Credits to Add
                if tier_id:
                    tier = SubscriptionTier.objects.get(id=tier_id, is_active=True)
                    total_usd = float(tier.price)
                    transaction_type = 'subscription'
                    metadata['tier_id'] = tier.id
                    description = f"Subscription: {tier.name} (Mock)"
                    
                    # Update user tier
                    request.user.tier = tier
                    request.user.save(update_fields=['tier'])
                    credits_to_add = getattr(tier, 'initial_credits', 50)
                    
                elif pack_id:
                    pack = CreditPack.objects.get(id=pack_id, is_active=True)
                    total_usd = float(pack.price)
                    transaction_type = 'credit_pack'
                    metadata['pack_id'] = pack.id
                    metadata['credits'] = pack.credits
                    description = f"Credit Pack: {pack.name} ({pack.credits} credits) (Mock)"
                    credits_to_add = pack.credits
                    
                elif requested_credits:
                    requested_credits = int(requested_credits)
                    if requested_credits <= 0:
                        return Response({'detail': get_msg('invalid_credits')}, status=status.HTTP_400_BAD_REQUEST)
                    
                    pricing = CreditPricing.objects.first()
                    base_price_usd = pricing.price_per_credit_usd if pricing else Decimal('0.10')
                    discount_percent = request.user.tier.credit_discount_percent if request.user.tier else 0
                    
                    total_usd = float(base_price_usd) * requested_credits
                    if discount_percent > 0:
                        total_usd = total_usd * (1 - (discount_percent / 100))
                    
                    # Check for Bonus Credits
                    bonus_credits = 0
                    bonus_rule = CreditBonusRule.objects.filter(
                        is_active=True, 
                        min_credits__lte=requested_credits
                    ).order_by('-min_credits').first()
                    if bonus_rule:
                        bonus_credits = bonus_rule.bonus_credits

                    credits_to_add = requested_credits + bonus_credits
                    metadata['requested_credits'] = requested_credits
                    metadata['bonus_credits'] = bonus_credits
                    description = f"Purchase {requested_credits} credits (+{bonus_credits} bonus) (Mock)"
                else:
                    return Response({'detail': get_msg('no_product')}, status=status.HTTP_400_BAD_REQUEST)

                # 2. Convert USD to UZS
                exchange = ExchangeRate.objects.first()
                rate = float(exchange.usd_to_uzs) if exchange else 12800.0
                total_uzs = total_usd * rate
                metadata['usd_rate'] = rate

                # 3. Create completed Transaction Record
                PaymentTransaction.objects.create(
                    user=request.user,
                    amount_usd=total_usd,
                    amount_uzs=total_uzs,
                    transaction_type=transaction_type,
                    status='completed',
                    provider_transaction_id=f"MOCK_PAY_{request.user.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                    metadata=metadata
                )

                # 4. Add credits to User Balance
                user_balance, _ = CreditBalance.objects.get_or_create(user=request.user)
                if credits_to_add > 0:
                    user_balance.balance += Decimal(str(credits_to_add))
                    user_balance.save()

                    # Log credit transaction
                    CreditTransactionLog.objects.create(
                        user=request.user,
                        amount=Decimal(str(credits_to_add)),
                        description=description
                    )

                new_balance = float(user_balance.balance)

            detail_text = get_msg('tier_success') if tier_id else get_msg('success', credits=credits_to_add)

            return Response({
                'mock': True,
                'detail': detail_text,
                'added_credits': credits_to_add,
                'new_balance': new_balance,
            }, status=status.HTTP_200_OK)

        except SubscriptionTier.DoesNotExist:
            return Response({'detail': 'Subscription Tier not found.'}, status=status.HTTP_404_NOT_FOUND)
        except CreditPack.DoesNotExist:
            return Response({'detail': 'Credit Pack not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Mock Payment Error: {str(e)}", exc_info=True)
            return Response({'detail': 'Payment failed. Please try again.'}, status=status.HTTP_400_BAD_REQUEST)


# ─── ATMOS Callback ──────────────────────────────────────

@csrf_exempt
def atmos_callback(request):
    """
    ATMOS Callback API handler.
    
    ATMOS sends payment data before confirming the transaction.
    We verify the signature, credit the user, and respond with {status: 1}.
    """
    if request.method != 'POST':
        return JsonResponse({'status': 0, 'message': 'Method not allowed'}, status=200)
    
    try:
        data = json.loads(request.body)
        logger.info(f"ATMOS Callback received: {json.dumps(data, indent=2)}")

        # Extract fields
        store_id = str(data.get('store_id', ''))
        transaction_id = str(data.get('transaction_id', ''))
        invoice = str(data.get('invoice', ''))
        amount = str(data.get('amount', ''))
        received_sign = data.get('sign', '')
        account = data.get('account', '')  # Our internal PaymentTransaction ID

        # Verify signature: sha256(store_id + transaction_id + invoice + amount + api_key)
        api_key = settings.ATMOS_CONFIG.get('API_KEY', '')
        sign_string = f"{store_id}{transaction_id}{invoice}{amount}{api_key}"
        expected_sign = hashlib.sha256(sign_string.encode()).hexdigest()

        if received_sign and received_sign != expected_sign:
            logger.warning(f"ATMOS Callback: Invalid signature. Expected={expected_sign}, Got={received_sign}")
            return JsonResponse({'status': 0, 'message': 'Invalid signature'}, status=200)

        # Find transaction
        payment_tx = None
        if account:
            try:
                payment_tx = PaymentTransaction.objects.get(id=int(account))
            except (PaymentTransaction.DoesNotExist, ValueError):
                pass

        if not payment_tx:
            try:
                payment_tx = PaymentTransaction.objects.get(provider_transaction_id=transaction_id)
            except PaymentTransaction.DoesNotExist:
                logger.error(f"ATMOS Callback: Transaction not found. account={account}, tx_id={transaction_id}")
                return JsonResponse({'status': 0, 'message': 'Transaction not found'}, status=200)

        # Avoid double-processing
        if payment_tx.status == 'completed':
            return JsonResponse({'status': 1, 'message': 'Already processed'}, status=200)

        # Credit the user
        with transaction.atomic():
            user = payment_tx.user
            balance, _ = CreditBalance.objects.get_or_create(user=user)
            credits_to_add = 0
            log_description = ""

            if payment_tx.transaction_type == 'subscription':
                tier_id = payment_tx.metadata.get('tier_id')
                try:
                    tier = SubscriptionTier.objects.get(id=tier_id)
                    user.tier = tier
                    user.save()
                    credits_to_add = tier.credits
                    log_description = f"Subscription Activated: {tier.name} (+{tier.credits} credits)"
                except SubscriptionTier.DoesNotExist:
                    logger.error(f"Tier {tier_id} not found for transaction {payment_tx.id}")
            
            elif payment_tx.transaction_type == 'credit_pack':
                credits_to_add = payment_tx.metadata.get('credits', 0)
                log_description = f"Credit Pack Purchase: {credits_to_add} credits"
            
            elif payment_tx.transaction_type == 'pay_as_you_go':
                requested = payment_tx.metadata.get('requested_credits', 0)
                bonus = payment_tx.metadata.get('bonus_credits', 0)
                credits_to_add = requested + bonus
                log_description = f"ATMOS Top-up: {requested} + {bonus} bonus"

            if credits_to_add > 0:
                balance.balance += credits_to_add
                balance.save()
                
                CreditTransactionLog.objects.create(
                    user=user,
                    amount=credits_to_add,
                    description=log_description
                )
            
            payment_tx.status = 'completed'
            payment_tx.save()

        logger.info(f"ATMOS Callback: Credited {credits_to_add} to {user.email}")
        return JsonResponse({'status': 1, 'message': 'Successfully'}, status=200)

    except Exception as e:
        logger.error(f"ATMOS Callback Error: {str(e)}", exc_info=True)
        return JsonResponse({'status': 0, 'message': 'Internal error'}, status=200)
