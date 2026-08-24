from django.core.management.base import BaseCommand
from django.db.models import Q

from accounts.models import User
from orders.models import Order


class Command(BaseCommand):
    help = "Remove soft-deleted customer accounts (Deleted User / deleted_*@deleted.local)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be removed without deleting.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        deleted_qs = User.objects.filter(role="customer").filter(
            Q(full_name="Deleted User") | Q(email__endswith="@deleted.local", is_active=False)
        )
        total = deleted_qs.count()
        if total == 0:
            self.stdout.write(self.style.SUCCESS("No deleted customer accounts found."))
            return

        removed = 0
        kept = 0
        for user in deleted_qs:
            order_count = Order.objects.filter(user=user).count()
            if order_count:
                kept += 1
                self.stdout.write(
                    f"KEEP {user.id} ({order_count} orders) — hidden from admin, orders preserved"
                )
                continue
            if dry_run:
                self.stdout.write(f"WOULD DELETE {user.id}")
            else:
                user.delete()
                self.stdout.write(f"DELETED {user.id}")
            removed += 1

        if dry_run:
            self.stdout.write(self.style.WARNING(f"Dry run: would delete {removed}, keep {kept} of {total}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Deleted {removed}, kept {kept} of {total} deleted accounts"))
