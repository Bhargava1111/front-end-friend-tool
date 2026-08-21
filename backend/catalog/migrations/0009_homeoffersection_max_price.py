from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0008_homeoffersection"),
    ]

    operations = [
        migrations.AddField(
            model_name="homeoffersection",
            name="max_price",
            field=models.PositiveIntegerField(default=99, help_text="Price ceiling for budget / under-price sections"),
        ),
    ]
