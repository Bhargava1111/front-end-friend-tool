import uuid

from django.db import models


class Notification(models.Model):
    class Type(models.TextChoices):
        ORDER = "order", "Order"
        ADMIN_ORDER = "admin_order", "Admin Order"
        PROMO = "promo", "Promo"
        SYSTEM = "system", "System"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=255)
    body = models.TextField()
    image_url = models.URLField(blank=True, default="")
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.SYSTEM)
    order = models.ForeignKey("orders.Order", on_delete=models.CASCADE, null=True, blank=True)
    link = models.CharField(max_length=255, blank=True, default="")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
