from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0006_product_price_tiers"),
    ]

    operations = [
        migrations.AlterField(
            model_name="banner",
            name="image_url",
            field=models.URLField(blank=True, default="", max_length=500),
        ),
    ]
