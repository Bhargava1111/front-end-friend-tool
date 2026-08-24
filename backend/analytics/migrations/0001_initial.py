import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("catalog", "0014_home_section_max_price_null"),
        ("orders", "0003_order_out_for_delivery_status"),
    ]

    operations = [
        migrations.CreateModel(
            name="SearchEvent",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("session_id", models.CharField(db_index=True, max_length=64)),
                ("query", models.CharField(max_length=255)),
                ("query_normalized", models.CharField(db_index=True, max_length=255)),
                ("detected_category", models.CharField(blank=True, default="", max_length=120)),
                ("detected_brand", models.CharField(blank=True, default="", max_length=120)),
                ("filters", models.JSONField(blank=True, default=dict)),
                ("results_count", models.IntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="search_events",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="ProductViewEvent",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("session_id", models.CharField(db_index=True, max_length=64)),
                ("product_name", models.CharField(blank=True, default="", max_length=255)),
                ("category", models.CharField(blank=True, default="", max_length=120)),
                ("source", models.CharField(blank=True, default="", max_length=80)),
                ("referrer", models.CharField(blank=True, default="", max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "product",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="view_events",
                        to="catalog.product",
                    ),
                ),
                (
                    "search",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="product_views",
                        to="analytics.searchevent",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="product_view_events",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="JourneyEvent",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("session_id", models.CharField(db_index=True, max_length=64)),
                (
                    "event_type",
                    models.CharField(
                        choices=[
                            ("click", "Product click"),
                            ("add_to_cart", "Add to cart"),
                            ("checkout", "Checkout"),
                            ("purchase", "Purchase"),
                        ],
                        db_index=True,
                        max_length=20,
                    ),
                ),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "order",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="journey_events",
                        to="orders.order",
                    ),
                ),
                (
                    "product",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="journey_events",
                        to="catalog.product",
                    ),
                ),
                (
                    "search",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="journey_events",
                        to="analytics.searchevent",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="journey_events",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="searchevent",
            index=models.Index(fields=["created_at"], name="analytics_s_created_idx"),
        ),
        migrations.AddIndex(
            model_name="searchevent",
            index=models.Index(fields=["query_normalized", "created_at"], name="analytics_s_query_n_idx"),
        ),
        migrations.AddIndex(
            model_name="searchevent",
            index=models.Index(fields=["session_id", "created_at"], name="analytics_s_session_idx"),
        ),
        migrations.AddIndex(
            model_name="searchevent",
            index=models.Index(fields=["user", "created_at"], name="analytics_s_user_id_idx"),
        ),
        migrations.AddIndex(
            model_name="searchevent",
            index=models.Index(fields=["results_count", "created_at"], name="analytics_s_results_idx"),
        ),
        migrations.AddIndex(
            model_name="productviewevent",
            index=models.Index(fields=["created_at"], name="analytics_p_created_idx"),
        ),
        migrations.AddIndex(
            model_name="productviewevent",
            index=models.Index(fields=["product", "created_at"], name="analytics_p_product_idx"),
        ),
        migrations.AddIndex(
            model_name="productviewevent",
            index=models.Index(fields=["session_id", "product", "created_at"], name="analytics_p_sess_pr_idx"),
        ),
        migrations.AddIndex(
            model_name="productviewevent",
            index=models.Index(fields=["search", "created_at"], name="analytics_p_search_idx"),
        ),
        migrations.AddIndex(
            model_name="journeyevent",
            index=models.Index(fields=["event_type", "created_at"], name="analytics_j_event_t_idx"),
        ),
        migrations.AddIndex(
            model_name="journeyevent",
            index=models.Index(fields=["product", "event_type", "created_at"], name="analytics_j_prod_ev_idx"),
        ),
        migrations.AddIndex(
            model_name="journeyevent",
            index=models.Index(fields=["search", "event_type"], name="analytics_j_search_idx"),
        ),
        migrations.AddIndex(
            model_name="journeyevent",
            index=models.Index(fields=["session_id", "event_type", "created_at"], name="analytics_j_sess_ev_idx"),
        ),
        migrations.AddIndex(
            model_name="journeyevent",
            index=models.Index(fields=["order"], name="analytics_j_order_i_idx"),
        ),
    ]
