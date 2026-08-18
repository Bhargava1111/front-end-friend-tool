import logging
import os
import uuid

logger = logging.getLogger(__name__)


def create_payment_intent(order, method: str) -> dict:
    amount_paise = int(float(order.total) * 100)
    gateway = os.getenv("PAYMENT_GATEWAY", "demo")

    if gateway == "razorpay":
        key_id = os.getenv("RAZORPAY_KEY_ID", "")
        key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")
        if key_id and key_secret:
            try:
                import razorpay

                client = razorpay.Client(auth=(key_id, key_secret))
                rz_order = client.order.create({
                    "amount": amount_paise,
                    "currency": "INR",
                    "receipt": order.order_number,
                })
                return {
                    "gateway": "razorpay",
                    "order_id": rz_order["id"],
                    "amount": amount_paise,
                    "currency": "INR",
                    "key_id": key_id,
                }
            except Exception as exc:
                logger.exception("Razorpay order create failed: %s", exc)

    demo_id = f"demo_{uuid.uuid4().hex[:12]}"
    return {
        "gateway": "demo",
        "order_id": demo_id,
        "amount": amount_paise,
        "currency": "INR",
        "key_id": "demo_key",
        "demo": True,
    }


def verify_payment(gateway: str, gateway_order_id: str, gateway_payment_id: str, signature: str = "") -> bool:
    if gateway == "demo":
        return True
    if gateway == "razorpay":
        key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")
        if not key_secret:
            return False
        try:
            import razorpay

            client = razorpay.Client(auth=(os.getenv("RAZORPAY_KEY_ID", ""), key_secret))
            client.utility.verify_payment_signature({
                "razorpay_order_id": gateway_order_id,
                "razorpay_payment_id": gateway_payment_id,
                "razorpay_signature": signature,
            })
            return True
        except Exception:
            return False
    return False
