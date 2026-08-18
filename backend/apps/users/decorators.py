from functools import wraps
from rest_framework.response import Response
from rest_framework import status

def require_credits(cost=1):
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(*args, **kwargs):
            # Identify request object (handles both FBV and CBV)
            # args[0] is request for FBV, args[1] is request for CBV method
            request = args[0] if hasattr(args[0], 'user') else args[1]
            user = request.user
            
            if not user.is_authenticated:
                return Response({"detail": "Please log in to continue your learning journey!"}, status=status.HTTP_401_UNAUTHORIZED)
            
            # Ensure the user has a credit balance
            if not hasattr(user, 'credit_balance'):
                return Response({"detail": "We couldn't find your credit account. Please contact support if this persists."}, status=status.HTTP_400_BAD_REQUEST)
                
            balance_obj = user.credit_balance
            
            if balance_obj.balance < cost:
                return Response({
                    "detail": f"You've hit your credit limit! This action requires {cost} credits. Please top up your balance to continue your learning journey.",
                    "code": "insufficient_credits"
                }, status=status.HTTP_402_PAYMENT_REQUIRED)
                
            return view_func(*args, **kwargs)
        return _wrapped_view
    return decorator
