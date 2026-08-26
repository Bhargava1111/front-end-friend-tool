import os

from django.conf import settings
from django.core.management.base import BaseCommand

from accounts.models import User

DEMO_PASSWORD = "Demo@12345"
ADMINS = [
    ("admin@mnxstore.in", "+919000000001", "Super Admin"),
    ("manager@mnxstore.in", "+919000000002", "Store Manager"),
    ("orders@mnxstore.in", "+919000000003", "Order Desk"),
]


class Command(BaseCommand):
    help = "Ensure demo admin accounts exist with the known demo password"

    def handle(self, *args, **options):
        if not settings.DEBUG and not os.getenv("ALLOW_DEMO_SEED"):
            raise SystemExit("Refusing to ensure demo admins in production without ALLOW_DEMO_SEED")

        created = []
        updated = []
        for email, phone, name in ADMINS:
            user, was_created = User.objects.get_or_create(
                email=email,
                defaults={
                    "phone": phone,
                    "full_name": name,
                    "role": "admin",
                    "is_staff": True,
                    "is_phone_verified": True,
                    "is_email_verified": True,
                },
            )
            user.set_password(DEMO_PASSWORD)
            user.role = "admin"
            user.is_staff = True
            user.is_active = True
            if phone and not user.phone:
                user.phone = phone
            if name and not user.full_name:
                user.full_name = name
            user.save()
            (created if was_created else updated).append(email)

        self.stdout.write(
            self.style.SUCCESS(
                f"Demo admins ready ({len(created)} created, {len(updated)} updated). "
                f"Login: admin@mnxstore.in / {DEMO_PASSWORD}"
            )
        )
