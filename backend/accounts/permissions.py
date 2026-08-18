from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission
from django.utils import timezone

from accounts.admin_session import (
    get_admin_session_from_request,
    is_admin_session_idle,
    touch_admin_session,
)


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated and (u.role == "admin" or u.is_staff)):
            return False
        if getattr(view, "admin_session_exempt", False):
            return True

        session = get_admin_session_from_request(request)
        if not session:
            raise PermissionDenied("Admin OTP verification required.")
        if is_admin_session_idle(session):
            session.revoked_at = timezone.now()
            session.save(update_fields=["revoked_at"])
            raise PermissionDenied("Admin session expired. Verify OTP again.")

        touch_admin_session(session)
        return True


class IsAuthenticatedUser(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)
