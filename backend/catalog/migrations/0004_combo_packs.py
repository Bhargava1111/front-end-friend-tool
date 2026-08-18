from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0003_productofferplacement"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="combo_items",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="product",
            name="is_combo",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="banner",
            name="product",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="combo_banners",
                to="catalog.product",
            ),
        ),
    ]
