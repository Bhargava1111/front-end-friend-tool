import uuid

from django.db import models


class SupportTicket(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In Progress"
        RESOLVED = "resolved", "Resolved"
        CLOSED = "closed", "Closed"

    class Category(models.TextChoices):
        ORDER = "order", "Order"
        DELIVERY = "delivery", "Delivery"
        PAYMENT = "payment", "Payment"
        PRODUCT = "product", "Product"
        OTHER = "other", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=120)
    email = models.EmailField(blank=True, default="")
    phone = models.CharField(max_length=15, blank=True, default="")
    subject = models.CharField(max_length=255)
    message = models.TextField()
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    order = models.ForeignKey("orders.Order", on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    admin_notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Feedback(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True)
    rating = models.PositiveSmallIntegerField(default=5)
    message = models.TextField()
    page = models.CharField(max_length=50, blank=True, default="feedback")
    created_at = models.DateTimeField(auto_now_add=True)


class UserActivityLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=80)
    resource = models.CharField(max_length=80, blank=True, default="")
    resource_id = models.CharField(max_length=64, blank=True, default="")
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class WalletAccount(models.Model):
    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="wallet")
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)


class WalletTransaction(models.Model):
    class Type(models.TextChoices):
        CREDIT = "credit", "Credit"
        DEBIT = "debit", "Debit"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet = models.ForeignKey(WalletAccount, on_delete=models.CASCADE, related_name="transactions")
    type = models.CharField(max_length=10, choices=Type.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.CharField(max_length=255)
    reference = models.CharField(max_length=100, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)


class LoyaltyAccount(models.Model):
    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="loyalty")
    points = models.PositiveIntegerField(default=0)
    lifetime_points = models.PositiveIntegerField(default=0)
    tier = models.CharField(max_length=30, default="bronze")
    updated_at = models.DateTimeField(auto_now=True)


class ReferralCode(models.Model):
    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="referral_code")
    code = models.CharField(max_length=20, unique=True)
    total_referrals = models.PositiveIntegerField(default=0)
    total_earned = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)


class ReferralRedemption(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    referrer = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="referrals_made")
    referred = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="referred_by")
    reward_amount = models.DecimalField(max_digits=10, decimal_places=2, default=50)
    created_at = models.DateTimeField(auto_now_add=True)


class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey("orders.Order", on_delete=models.CASCADE, related_name="payments")
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE)
    method = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    gateway = models.CharField(max_length=30, blank=True, default="")
    gateway_order_id = models.CharField(max_length=100, blank=True, default="")
    gateway_payment_id = models.CharField(max_length=100, blank=True, default="")
    failure_reason = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Refund(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSED = "processed", "Processed"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey("orders.Order", on_delete=models.CASCADE, related_name="refunds")
    return_request = models.ForeignKey("orders.OrderReturn", on_delete=models.SET_NULL, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=20, default="wallet")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class ServiceablePincode(models.Model):
    pincode = models.CharField(max_length=6, unique=True)
    city = models.CharField(max_length=100, blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)


class DeliveryRider(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=15)
    vehicle = models.CharField(max_length=50, blank=True, default="bike")
    is_active = models.BooleanField(default=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    total_deliveries = models.PositiveIntegerField(default=0)
    rating = models.FloatField(default=5.0)
    created_at = models.DateTimeField(auto_now_add=True)


class DeliveryAssignment(models.Model):
    class Status(models.TextChoices):
        ASSIGNED = "assigned", "Assigned"
        PICKED_UP = "picked_up", "Picked Up"
        IN_TRANSIT = "in_transit", "In Transit"
        DELIVERED = "delivered", "Delivered"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField("orders.Order", on_delete=models.CASCADE, related_name="delivery")
    rider = models.ForeignKey(DeliveryRider, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ASSIGNED)
    assigned_at = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    earnings = models.DecimalField(max_digits=8, decimal_places=2, default=0)


class PriceWatch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="price_watches")
    product = models.ForeignKey("catalog.Product", on_delete=models.CASCADE)
    target_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    last_price = models.DecimalField(max_digits=10, decimal_places=2)
    notified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("user", "product")]


class PushSubscription(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="push_subscriptions")
    endpoint = models.TextField()
    keys = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)


class BOGOPromotion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    buy_product = models.ForeignKey("catalog.Product", on_delete=models.CASCADE, related_name="bogo_buy")
    get_product = models.ForeignKey("catalog.Product", on_delete=models.CASCADE, related_name="bogo_get")
    get_quantity = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class CategoryDiscount(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.ForeignKey("catalog.Category", on_delete=models.CASCADE, related_name="discounts")
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2)
    is_active = models.BooleanField(default=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
