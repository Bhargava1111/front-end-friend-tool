from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0014_home_section_max_price_null"),
    ]

    operations = [
        migrations.AddField(
            model_name="productvariant",
            name="price_tiers",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
