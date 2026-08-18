import logging
from rest_framework import permissions

from apps.roadmaps.services.security import get_owner_filter

logger = logging.getLogger('edtrack.auth_audit')

class UserOwnershipMixin:
    """
    Mixin to strictly enforce that querysets only return objects owned by the request.user.
    Requires models to define an OWNER_PATH attribute.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if hasattr(super(), 'get_queryset'):
            queryset = super().get_queryset()
        elif hasattr(self, 'queryset') and self.queryset is not None:
            queryset = self.queryset.all()
        else:
            # If no queryset is defined at all, return an empty set if possible or None
            return []
            
        if not hasattr(queryset, 'model'):
            # This handles cases where queryset might be a list or other non-ORM object
            return queryset

        user = self.request.user
        model = queryset.model
        
        # Use explicit ownership path defined on the model
        owner_filter = get_owner_filter(model, user)
        
        if owner_filter:
            qs = queryset.filter(**owner_filter)
            if model.__name__ == 'Roadmap':
                qs = qs.filter(is_hidden=False)
        else:
            # If no explicitly defined ownership path, return nothing for safety
            logger.error(f"SECURITY: Model {model.__name__} missing OWNER_PATH configuration. Empty queryset returned.")
            qs = queryset.none()
            
        # Enhanced logging for User visibility
        obj_info = ""
        try:
            if model.__name__ == 'Roadmap':
                obj_info = f" | IDs/Topics: {[(r.id, getattr(r, 'topic', '')[:20]) for r in qs[:5]]}"
            elif model.__name__ == 'Lesson':
                obj_info = f" | IDs/Titles: {[(l.id, getattr(l, 'title', '')[:20]) for l in qs[:5]]}"
        except Exception as e:
            logger.debug(f"Audit log info extraction failed: {e}")
            
        logger.info(f"DATA-AUDIT | User: {user.email} | Model: {model.__name__} | Count: {qs.count()}{obj_info}")
        return qs
