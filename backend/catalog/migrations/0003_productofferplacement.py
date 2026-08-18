from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0002_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProductOfferPlacement",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                (
                    "section",
                    models.CharField(
                        choices=[
                            ("flash_sale", "Flash Sale"),
                            ("todays_deals", "Today's Deals"),
                            ("under_99", "Under ₹99"),
                            ("festive_picks", "Festive Picks"),
                            ("combo_packs", "Combo Packs"),
                            ("custom_offers", "Custom Offers"),
                        ],
                        max_length=30,
                    ),
                ),
                ("sort_order", models.IntegerField(default=0)),
                ("offer_label", models.CharField(blank=True, default="", max_length=80)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="offer_placements",
                        to="catalog.product",
                    ),
                ),
            ],
            options={
                "ordering": ["sort_order", "-created_at"],
                "unique_together": {("product", "section")},
            },
        ),
    ]
