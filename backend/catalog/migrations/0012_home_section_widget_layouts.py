from django.db import migrations

from catalog.home_sections_defaults import ensure_default_home_sections


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0011_home_sections_extras"),
    ]

    operations = [
        migrations.RunPython(
            lambda apps, schema_editor: ensure_default_home_sections(
                apps.get_model("catalog", "HomeOfferSection")
            ),
            migrations.RunPython.noop,
        ),
    ]
