import math
from django.db import transaction
from django.conf import settings
from .models import CreditBalance, CreditTransactionLog

def deduct_credits_by_tokens(user, total_tokens, min_credits=0, description=""):
    """
    Calculates credit cost based on token usage and deducts from user balance.
    Formula: units = ceil(total_tokens / 1000)
    Ensures a minimum credit deduction if specified.
    """
    from decimal import Decimal
    token_price = getattr(settings, 'TOKEN_PRICE_PER_CREDIT', 1000)
    calculated_credits = Decimal(total_tokens) / Decimal(token_price)
    
    # Enforce minimum cost
    final_deduction = max(calculated_credits, Decimal(min_credits))
    
    if final_deduction <= 0:
        return 0, 0

    with transaction.atomic():
        balance_obj, created = CreditBalance.objects.get_or_create(user=user)
        
        # Determine actual deduction (cannot exceed current balance)
        actual_deduction = min(final_deduction, balance_obj.balance)
        
        if actual_deduction < final_deduction:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"User {user.email} had insufficient credits ({balance_obj.balance}) for full deduction ({final_deduction}). Floor logic applied.")

        balance_obj.balance -= actual_deduction
        balance_obj.save()
        
        # Log the transaction
        log_msg = f"{description} ({total_tokens} tokens)" if description else f"AI Usage ({total_tokens} tokens)"
        CreditTransactionLog.objects.create(
            user=user,
            amount=-actual_deduction,
            description=log_msg
        )
        
    return final_deduction, total_tokens
