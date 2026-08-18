from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0005_category_parent"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="price_tiers",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
