from django.db import migrations


def seed_extra_sections(apps, schema_editor):
    from catalog.home_sections_defaults import ensure_default_home_sections

    HomeOfferSection = apps.get_model("catalog", "HomeOfferSection")
    ensure_default_home_sections(HomeOfferSection)


def normalize_sort(apps, schema_editor):
    HomeOfferSection = apps.get_model("catalog", "HomeOfferSection")
    sections = list(HomeOfferSection.objects.all().order_by("sort_order", "title"))
    for i, section in enumerate(sections):
        if section.sort_order != i + 1:
            section.sort_order = i + 1
            section.save(update_fields=["sort_order"])


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0010_alter_banner_placement"),
    ]

    operations = [
        migrations.RunPython(seed_extra_sections, migrations.RunPython.noop),
        migrations.RunPython(normalize_sort, migrations.RunPython.noop),
    ]
