import logging
from django.core.exceptions import PermissionDenied
from django.db.models import Model

logger = logging.getLogger('edtrack.security')

def verify_ownership(user, obj) -> bool:
    """
    Centralized ownership verification for any model instance.
    Expected to work with models having an OWNER_PATH attribute.
    """
    if not user or user.is_anonymous:
        return False
    
    if not hasattr(obj, 'OWNER_PATH'):
        logger.error(f"Security Configuration Error: Model {obj.__class__.__name__} missing OWNER_PATH")
        return False
    
    owner_path = obj.OWNER_PATH
    # Traverse the path to find the owner user object
    parts = owner_path.split('__')
    current_val = obj
    for part in parts:
        current_val = getattr(current_val, part, None)
        if current_val is None:
            break
            
    return current_val == user

def get_owner_filter(model: Model, user):
    """
    Returns the filter dict for a queryset based on model's OWNER_PATH.
    Example: if OWNER_PATH is 'roadmap__user', returns {'roadmap__user': user}
    """
    if not hasattr(model, 'OWNER_PATH'):
        # Fallback to current magic for transition phase or fail hard
        # For now, let's log and return empty to force explicit definition
        logger.error(f"Security Configuration Error: Model {model.__name__} missing OWNER_PATH")
        return None
        
    return {model.OWNER_PATH: user}
