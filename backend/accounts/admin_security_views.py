from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.admin_session import (
    admin_contact,
    admin_otp_identifier,
    create_admin_panel_session,
    get_admin_session_from_request,
    is_admin_session_idle,
    revoke_admin_panel_sessions,
)
from accounts.otp import is_preview_host, issue_otp, verify_otp
from accounts.models import OtpCode
from accounts.permissions import IsAdminRole


class AdminPanelAccessMixin:
    admin_session_exempt = True


class AdminPanelOtpRequestView(AdminPanelAccessMixin, APIView):
    permission_classes = [IsAdminRole]

    def post(self, request):
        user = request.user
        try:
            target, channel = admin_contact(user)
        except ValueError as e:
            return Response({"ok": False, "detail": str(e)}, status=400)

        identifier = admin_otp_identifier(user)
        purpose = "admin_panel"

        last = (
            OtpCode.objects.filter(identifier=identifier, purpose=purpose)
            .order_by("-created_at")
            .first()
        )
        if last:
            since = (timezone.now() - last.created_at).total_seconds()
            if since < settings.OTP_RESEND_COOLDOWN:
                wait = int(settings.OTP_RESEND_COOLDOWN - since)
                return Response(
                    {
                        "ok": False,
                        "detail": f"Please wait {wait}s before requesting another code.",
                        "cooldown_seconds": wait,
                    },
                    status=429,
                )

        code, row = issue_otp(identifier, channel, purpose)
        masked = _mask_target(target, channel)
        payload = {
            "ok": True,
            "sent": True,
            "channel": channel,
            "masked_target": masked,
            "expires_at": row.expires_at.isoformat(),
            "cooldown_seconds": settings.OTP_RESEND_COOLDOWN,
            "expires_in": settings.OTP_TTL_SECONDS,
            "idle_timeout_seconds": settings.ADMIN_PANEL_IDLE_SECONDS,
        }
        if is_preview_host(request) or settings.DEBUG:
            payload["preview_code"] = code
        return Response(payload)


class AdminPanelOtpVerifyView(AdminPanelAccessMixin, APIView):
    permission_classes = [IsAdminRole]

    def post(self, request):
        code = str(request.data.get("code", "")).strip()
        if len(code) < 4:
            return Response({"ok": False, "detail": "Enter the verification code."}, status=400)

        identifier = admin_otp_identifier(request.user)
        ok, msg, remaining = verify_otp(identifier, code, "admin_panel")
        if not ok:
            return Response({"ok": False, "detail": msg, "attempts_remaining": remaining}, status=400)

        token, session = create_admin_panel_session(request.user)
        idle = settings.ADMIN_PANEL_IDLE_SECONDS
        return Response(
            {
                "ok": True,
                "session_token": token,
                "expires_at": (session.last_activity_at + timedelta(seconds=idle)).isoformat(),
                "idle_timeout_seconds": idle,
            }
        )


class AdminPanelSessionView(AdminPanelAccessMixin, APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        session = get_admin_session_from_request(request)
        if not session:
            return Response({"ok": True, "valid": False, "reason": "missing"})
        if is_admin_session_idle(session):
            session.revoked_at = timezone.now()
            session.save(update_fields=["revoked_at"])
            return Response({"ok": True, "valid": False, "reason": "idle_timeout"})
        idle = settings.ADMIN_PANEL_IDLE_SECONDS
        remaining = idle - int((timezone.now() - session.last_activity_at).total_seconds())
        return Response(
            {
                "ok": True,
                "valid": True,
                "expires_at": (session.last_activity_at + timedelta(seconds=idle)).isoformat(),
                "idle_seconds_remaining": max(0, remaining),
                "idle_timeout_seconds": idle,
            }
        )

    def delete(self, request):
        revoke_admin_panel_sessions(request.user)
        return Response({"ok": True})


def _mask_target(target: str, channel: str) -> str:
    if channel == "email" and "@" in target:
        name, domain = target.split("@", 1)
        if len(name) <= 2:
            masked_name = name[0] + "***"
        else:
            masked_name = name[0] + "***" + name[-1]
        return f"{masked_name}@{domain}"
    digits = "".join(c for c in target if c.isdigit())
    if len(digits) >= 4:
        return f"******{digits[-4:]}"
    return "your registered contact"
