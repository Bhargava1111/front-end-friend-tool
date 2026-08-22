from django.db import migrations, models

from catalog.home_sections_defaults import normalize_section_max_prices


def clear_non_budget_max_prices(apps, schema_editor):
    normalize_section_max_prices(apps.get_model("catalog", "HomeOfferSection"))


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0013_home_section_layout_choices"),
    ]

    operations = [
        migrations.AlterField(
            model_name="homeoffersection",
            name="max_price",
            field=models.PositiveIntegerField(
                blank=True,
                default=None,
                help_text="Price ceiling for budget / under-price sections only",
                null=True,
            ),
        ),
        migrations.RunPython(clear_non_budget_max_prices, migrations.RunPython.noop),
    ]
