import uuid

from django.conf import settings
from django.db import models


class SearchEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="search_events",
    )
    session_id = models.CharField(max_length=64, db_index=True)
    query = models.CharField(max_length=255)
    query_normalized = models.CharField(max_length=255, db_index=True)
    detected_category = models.CharField(max_length=120, blank=True, default="")
    detected_brand = models.CharField(max_length=120, blank=True, default="")
    filters = models.JSONField(default=dict, blank=True)
    results_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["created_at"], name="analytics_s_created_idx"),
            models.Index(fields=["query_normalized", "created_at"], name="analytics_s_query_n_idx"),
            models.Index(fields=["session_id", "created_at"], name="analytics_s_session_idx"),
            models.Index(fields=["user", "created_at"], name="analytics_s_user_id_idx"),
            models.Index(fields=["results_count", "created_at"], name="analytics_s_results_idx"),
        ]


class ProductViewEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="product_view_events",
    )
    session_id = models.CharField(max_length=64, db_index=True)
    product = models.ForeignKey(
        "catalog.Product",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="view_events",
    )
    product_name = models.CharField(max_length=255, blank=True, default="")
    category = models.CharField(max_length=120, blank=True, default="")
    search = models.ForeignKey(
        SearchEvent,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="product_views",
    )
    source = models.CharField(max_length=80, blank=True, default="")
    referrer = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["created_at"], name="analytics_p_created_idx"),
            models.Index(fields=["product", "created_at"], name="analytics_p_product_idx"),
            models.Index(fields=["session_id", "product", "created_at"], name="analytics_p_sess_pr_idx"),
            models.Index(fields=["search", "created_at"], name="analytics_p_search_idx"),
        ]


class JourneyEvent(models.Model):
    class EventType(models.TextChoices):
        CLICK = "click", "Product click"
        ADD_TO_CART = "add_to_cart", "Add to cart"
        CHECKOUT = "checkout", "Checkout"
        PURCHASE = "purchase", "Purchase"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="journey_events",
    )
    session_id = models.CharField(max_length=64, db_index=True)
    event_type = models.CharField(max_length=20, choices=EventType.choices, db_index=True)
    search = models.ForeignKey(
        SearchEvent,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="journey_events",
    )
    product = models.ForeignKey(
        "catalog.Product",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="journey_events",
    )
    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="journey_events",
    )
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["event_type", "created_at"], name="analytics_j_event_t_idx"),
            models.Index(fields=["product", "event_type", "created_at"], name="analytics_j_prod_ev_idx"),
            models.Index(fields=["search", "event_type"], name="analytics_j_search_idx"),
            models.Index(fields=["session_id", "event_type", "created_at"], name="analytics_j_sess_ev_idx"),
            models.Index(fields=["order"], name="analytics_j_order_i_idx"),
        ]
