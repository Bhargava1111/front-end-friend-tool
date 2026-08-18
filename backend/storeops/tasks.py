"""Background tasks — email, SMS, push, notifications."""

from __future__ import annotations

from celery import shared_task


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_email_task(self, to: str, subject: str, body: str) -> bool:
    from storeops.services.messaging import send_email_sync

    try:
        return send_email_sync(to, subject, body)
    except Exception as exc:
        raise self.retry(exc=exc) from exc


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_sms_task(self, phone: str, message: str) -> bool:
    from storeops.services.messaging import send_sms_sync

    try:
        return send_sms_sync(phone, message)
    except Exception as exc:
        raise self.retry(exc=exc) from exc


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_push_task(self, user_id: int, title: str, body: str, data: dict | None = None) -> int:
    from storeops.services.messaging import send_push_sync

    try:
        return send_push_sync(user_id, title, body, data)
    except Exception as exc:
        raise self.retry(exc=exc) from exc


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def deliver_notification_task(
    self,
    user_id: int,
    title: str,
    body: str,
    order_id: str | None = None,
    link: str = "",
) -> None:
    from django.contrib.auth import get_user_model

    from storeops.services.notifications import _deliver_notification

    User = get_user_model()
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return

    order = None
    if order_id:
        from orders.models import Order

        order = Order.objects.filter(pk=order_id).first()

    try:
        _deliver_notification(user, title, body, order=order, link=link)
    except Exception as exc:
        raise self.retry(exc=exc) from exc
