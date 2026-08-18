from decimal import Decimal

from django.utils import timezone

from notifications.models import Notification
from storeops.models import WalletAccount, WalletTransaction
from storeops.services.messaging import send_email, send_push, send_sms


def _deliver_notification(user, title: str, body: str, *, order=None, link: str = ""):
    push_data: dict[str, str] = {}
    if link:
        push_data["link"] = link
    if order:
        push_data["order_id"] = str(order.id)
    send_push(user.id, title, body, push_data or None)
    if user.email:
        send_email(user.email, title, body)
    if user.phone:
        send_sms(user.phone, f"{title}: {body}")


def notify_user(
    user,
    title: str,
    body: str,
    ntype: str = "system",
    *,
    order=None,
    link: str = "",
    image_url: str = "",
    async_dispatch: bool = True,
):
    Notification.objects.create(
        user=user,
        type=ntype,
        title=title,
        body=body,
        order=order,
        image_url=image_url or "",
        link=link or "",
    )

    if async_dispatch:
        from django.conf import settings

        if not getattr(settings, "CELERY_TASK_ALWAYS_EAGER", True):
            from storeops.tasks import deliver_notification_task

            deliver_notification_task.delay(
                user.id,
                title,
                body,
                str(order.id) if order else None,
                link,
            )
            return

    _deliver_notification(user, title, body, order=order, link=link)


def notify_order_status(order):
    labels = {
        "pending": "Order placed",
        "confirmed": "Order confirmed",
        "packed": "Order packed",
        "delivered": "Order delivered",
        "cancelled": "Order cancelled",
    }
    title = labels.get(order.status, "Order update")
    body = f"Your order {order.order_number} is now {order.status}."
    notify_user(
        order.user,
        title,
        body,
        "order",
        order=order,
        link=f"/orders/{order.id}",
    )


def credit_wallet(user, amount: Decimal, description: str, reference: str = ""):
    wallet, _ = WalletAccount.objects.get_or_create(user=user)
    wallet.balance += amount
    wallet.save(update_fields=["balance", "updated_at"])
    WalletTransaction.objects.create(
        wallet=wallet,
        type=WalletTransaction.Type.CREDIT,
        amount=amount,
        description=description,
        reference=reference,
    )


def process_refund(order, amount: Decimal, return_request=None, method: str = "wallet"):
    from storeops.models import Refund

    refund = Refund.objects.create(
        order=order,
        return_request=return_request,
        amount=amount,
        method=method,
        status=Refund.Status.PROCESSED,
        processed_at=timezone.now(),
    )
    if method == "wallet":
        credit_wallet(order.user, amount, f"Refund for {order.order_number}", str(refund.id))
    notify_user(
        order.user,
        "Refund processed",
        f"₹{amount} refunded for order {order.order_number}.",
        "order",
        order=order,
        link=f"/orders/{order.id}",
    )
    return refund
