import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from accounts.models import AdminPanelSession


def hash_admin_token(token: str) -> str:
    return hashlib.sha256(f"{token}{settings.SECRET_KEY}".encode()).hexdigest()


def admin_otp_identifier(user) -> str:
    return f"admin:{user.id}"


def admin_contact(user) -> tuple[str, str]:
    """Return (identifier, channel) for sending admin OTP."""
    email = (user.email or "").strip().lower()
    if email and not email.endswith(f"@{settings.PHONE_EMAIL_DOMAIN}"):
        return email, "email"
    if user.phone:
        return user.phone, "phone"
    raise ValueError("Add a verified email or phone to your admin account.")


def create_admin_panel_session(user) -> tuple[str, AdminPanelSession]:
    """Revoke prior sessions and issue a new admin panel session token."""
    now = timezone.now()
    AdminPanelSession.objects.filter(user=user, revoked_at__isnull=True).update(revoked_at=now)

    token = secrets.token_urlsafe(32)
    session = AdminPanelSession.objects.create(
        user=user,
        token_hash=hash_admin_token(token),
        last_activity_at=now,
    )
    return token, session


def get_admin_session_from_request(request) -> AdminPanelSession | None:
    token = (request.headers.get("X-Admin-Session") or request.META.get("HTTP_X_ADMIN_SESSION") or "").strip()
    if not token:
        return None
    return (
        AdminPanelSession.objects.filter(
            token_hash=hash_admin_token(token),
            revoked_at__isnull=True,
            user=request.user,
        )
        .select_related("user")
        .first()
    )


def is_admin_session_idle(session: AdminPanelSession) -> bool:
    idle = timedelta(seconds=settings.ADMIN_PANEL_IDLE_SECONDS)
    return timezone.now() - session.last_activity_at > idle


def touch_admin_session(session: AdminPanelSession) -> None:
    session.last_activity_at = timezone.now()
    session.save(update_fields=["last_activity_at"])


def revoke_admin_panel_sessions(user) -> None:
    AdminPanelSession.objects.filter(user=user, revoked_at__isnull=True).update(
        revoked_at=timezone.now()
    )


def validate_admin_panel_session(request) -> bool:
    session = get_admin_session_from_request(request)
    if not session:
        return False
    if is_admin_session_idle(session):
        session.revoked_at = timezone.now()
        session.save(update_fields=["revoked_at"])
        return False
    touch_admin_session(session)
    return True
