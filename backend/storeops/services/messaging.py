import logging
import json
import os

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def _use_celery() -> bool:
    return not getattr(settings, "CELERY_TASK_ALWAYS_EAGER", True)


def send_sms_sync(phone: str, message: str) -> bool:
    provider = os.getenv("SMS_PROVIDER", "console")
    if provider == "msg91":
        api_key = os.getenv("MSG91_API_KEY", "")
        if not api_key:
            logger.warning("MSG91_API_KEY not set")
            return False
        try:
            import urllib.parse
            import urllib.request

            params = urllib.parse.urlencode({
                "authkey": api_key,
                "mobiles": phone.replace("+", ""),
                "message": message,
                "sender": os.getenv("MSG91_SENDER", "MNXSTR"),
                "route": "4",
            })
            urllib.request.urlopen(f"https://api.msg91.com/api/sendhttp.php?{params}", timeout=10)
            return True
        except Exception as exc:
            logger.exception("SMS send failed: %s", exc)
            return False
    if provider == "twilio":
        sid = os.getenv("TWILIO_ACCOUNT_SID", "")
        token = os.getenv("TWILIO_AUTH_TOKEN", "")
        from_num = os.getenv("TWILIO_FROM_NUMBER", "")
        if not all([sid, token, from_num]):
            return False
        try:
            from twilio.rest import Client

            Client(sid, token).messages.create(body=message, from_=from_num, to=phone)
            return True
        except Exception as exc:
            logger.exception("Twilio SMS failed: %s", exc)
            return False
    logger.info("[SMS] %s -> %s", phone, message)
    return True


def send_email_sync(to: str, subject: str, body: str) -> bool:
    provider = os.getenv("EMAIL_PROVIDER", "console")
    if provider == "smtp" and settings.EMAIL_HOST:
        try:
            send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to], fail_silently=False)
            return True
        except Exception as exc:
            logger.exception("Email send failed: %s", exc)
            return False
    logger.info("[EMAIL] %s | %s | %s", to, subject, body[:120])
    return True


def send_push_sync(user_id, title: str, body: str, data: dict | None = None) -> int:
    from storeops.models import PushSubscription

    private_key = settings.VAPID_PRIVATE_KEY or os.getenv("VAPID_PRIVATE_KEY", "")
    subs = list(PushSubscription.objects.filter(user_id=user_id))
    if not subs:
        return 0

    payload = json.dumps({"title": title, "body": body, **(data or {})})

    if not private_key:
        for sub in subs:
            logger.info("[PUSH] user=%s endpoint=%s title=%s (no VAPID key)", user_id, sub.endpoint[:48], title)
        return 0

    try:
        from pywebpush import WebPushException, webpush
    except ImportError:
        logger.warning("pywebpush not installed — skipping web push")
        return 0

    sent = 0
    for sub in subs:
        subscription = {"endpoint": sub.endpoint, "keys": sub.keys}
        try:
            webpush(
                subscription_info=subscription,
                data=payload,
                vapid_private_key=private_key,
                vapid_claims={"sub": settings.VAPID_SUBJECT},
            )
            sent += 1
        except WebPushException as exc:
            status = exc.response.status_code if exc.response is not None else None
            logger.warning("Web push failed (%s) for user=%s: %s", status, user_id, exc)
            if status in (404, 410):
                sub.delete()
        except Exception as exc:
            logger.exception("Web push error for user=%s: %s", user_id, exc)
    return sent


def send_sms(phone: str, message: str) -> bool:
    if _use_celery():
        from storeops.tasks import send_sms_task

        send_sms_task.delay(phone, message)
        return True
    return send_sms_sync(phone, message)


def send_email(to: str, subject: str, body: str) -> bool:
    if _use_celery():
        from storeops.tasks import send_email_task

        send_email_task.delay(to, subject, body)
        return True
    return send_email_sync(to, subject, body)


def send_push(user_id, title: str, body: str, data: dict | None = None) -> int:
    if _use_celery():
        from storeops.tasks import send_push_task

        send_push_task.delay(user_id, title, body, data)
        return 1
    return send_push_sync(user_id, title, body, data)
