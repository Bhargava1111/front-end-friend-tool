import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import OtpCode


def hash_code(code: str) -> str:
    return hashlib.sha256(f"{code}{settings.SECRET_KEY}".encode()).hexdigest()


def generate_code() -> str:
    return f"{secrets.randbelow(10**6):06d}"


def is_preview_host(request) -> bool:
    host = request.get_host().lower()
    return (
        host.startswith("localhost")
        or host.startswith("127.0.0.1")
        or "lovable" in host
        or "lovableproject" in host
    )


def issue_otp(identifier: str, channel: str, purpose: str = "login") -> tuple[str, OtpCode]:
    OtpCode.objects.filter(
        identifier=identifier, purpose=purpose, consumed_at__isnull=True
    ).update(consumed_at=timezone.now())

    code = generate_code()
    if settings.ENABLE_DEMO_OTP:
        code = settings.DEMO_OTP_CODE

    row = OtpCode.objects.create(
        identifier=identifier,
        channel=channel,
        purpose=purpose,
        code_hash=hash_code(code),
        expires_at=timezone.now() + timedelta(seconds=settings.OTP_TTL_SECONDS),
    )
    if settings.DEBUG:
        print(f"[OTP] {identifier} ({channel}): {code}")
    else:
        from storeops.services.messaging import send_email, send_sms

        message = f"Your Sri Mahalakshmi Stores OTP is {code}. Valid for {settings.OTP_TTL_SECONDS // 60} minutes."
        if channel in ("sms", "phone"):
            send_sms(identifier if identifier.startswith("+") else f"+91{identifier[-10:]}", message)
        elif channel == "email":
            send_email(identifier, "Your login OTP", message)
    return code, row


def verify_otp(identifier: str, code: str, purpose: str = "login") -> tuple[bool, str, int]:
    if settings.ENABLE_DEMO_OTP and code == settings.DEMO_OTP_CODE:
        return True, "ok", 0

    row = (
        OtpCode.objects.filter(identifier=identifier, purpose=purpose, consumed_at__isnull=True)
        .order_by("-created_at")
        .first()
    )
    if not row:
        return False, "No active code — request a new one.", 0
    if row.expires_at < timezone.now():
        return False, "That code expired. Request a new one.", 0
    if row.attempts >= settings.OTP_MAX_ATTEMPTS:
        return False, "Too many attempts. Request a new code.", 0
    if hash_code(code) != row.code_hash:
        row.attempts += 1
        row.save(update_fields=["attempts"])
        remaining = max(0, settings.OTP_MAX_ATTEMPTS - row.attempts)
        return False, "That code is incorrect.", remaining

    row.consumed_at = timezone.now()
    row.attempts += 1
    row.save(update_fields=["consumed_at", "attempts"])
    return True, "ok", 0


def normalize_phone(raw: str) -> str:
    digits = "".join(c for c in raw if c.isdigit())
    local = digits[-10:] if len(digits) > 10 else digits
    if len(local) != 10:
        raise ValueError("Enter a valid 10-digit mobile number.")
    return f"+91{local}"


def phone_internal_email(local: str) -> str:
    return f"p{local}@{settings.PHONE_EMAIL_DOMAIN}"
