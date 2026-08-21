import uuid

from django.db import migrations, models


DEFAULT_SECTIONS = [
    ("flash_sale", "Flash Sale", "Ends at midnight — grab them before they're gone", "countdown_rail", "discounted", "flash", 1),
    ("todays_deals", "Today's deals", "", "rail", "featured", "today", 2),
    ("under_99", "Under ₹99 store", "Small basket, big savings", "budget_rail", "under_99", "budget", 3),
    ("festive_picks", "Festive picks", "Pooja kits, lamps and seasonal specials", "rail", "manual", "festive", 4),
    ("combo_packs", "Combo packs", "", "rail", "combo", "combo", 5),
    ("custom_offers", "Custom offers", "", "rail", "manual", "today", 6),
]


def seed_sections(apps, schema_editor):
    HomeOfferSection = apps.get_model("catalog", "HomeOfferSection")
    for key, title, subtitle, layout, fallback, tab, order in DEFAULT_SECTIONS:
        HomeOfferSection.objects.get_or_create(
            key=key,
            defaults={
                "title": title,
                "subtitle": subtitle,
                "layout": layout,
                "fallback_rule": fallback,
                "see_all_tab": tab,
                "sort_order": order,
                "is_active": True,
                "show_on_home": key in ("flash_sale", "todays_deals", "under_99", "festive_picks", "combo_packs"),
                "max_products": 12,
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0007_banner_image_url_length"),
    ]

    operations = [
        migrations.CreateModel(
            name="HomeOfferSection",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("key", models.SlugField(max_length=50, unique=True)),
                ("title", models.CharField(max_length=120)),
                ("subtitle", models.CharField(blank=True, default="", max_length=255)),
                ("layout", models.CharField(choices=[("rail", "Product rail"), ("countdown_rail", "Flash sale (countdown)"), ("budget_rail", "Budget store rail"), ("deal_card", "Deal of the day card")], default="rail", max_length=30)),
                ("fallback_rule", models.CharField(choices=[("manual", "Manual products only"), ("discounted", "Top discounted"), ("featured", "Featured products"), ("under_99", "Under ₹99"), ("best_seller", "Best sellers"), ("newest", "Newly added"), ("recommended", "Recommended"), ("combo", "Combo packs")], default="manual", max_length=30)),
                ("see_all_tab", models.CharField(blank=True, default="", max_length=30)),
                ("max_products", models.PositiveSmallIntegerField(default=12)),
                ("sort_order", models.IntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("show_on_home", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["sort_order", "title"],
            },
        ),
        migrations.AlterField(
            model_name="productofferplacement",
            name="section",
            field=models.CharField(db_index=True, max_length=50),
        ),
        migrations.RunPython(seed_sections, migrations.RunPython.noop),
    ]
