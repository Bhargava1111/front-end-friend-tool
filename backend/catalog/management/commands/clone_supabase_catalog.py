from django.core.management.base import BaseCommand

from catalog.supabase_import import SupabaseError, import_from_supabase


class Command(BaseCommand):
    help = "Clone all catalog data and images from the live Supabase project into Django"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing catalog data before importing",
        )
        parser.add_argument(
            "--mirror-images",
            action="store_true",
            help="Download remote images into backend/media/catalog/",
        )

    def handle(self, *args, **options):
        try:
            counts = import_from_supabase(
                reset=options["reset"],
                mirror_images=options["mirror_images"],
            )
        except SupabaseError as exc:
            self.stderr.write(self.style.ERROR(str(exc)))
            self.stderr.write(
                "\nAdd these to backend/.env:\n"
                "  SUPABASE_URL=https://xoijdtcwhmyhdgkzcmuh.supabase.co\n"
                "  SUPABASE_SERVICE_ROLE_KEY=<your service role key>\n"
                "\nFind keys in Supabase Dashboard → Project Settings → API.\n"
                "Or run: python manage.py import_supabase_catalog --reset (offline seed data).\n"
            )
            return

        for label, count in counts.items():
            self.stdout.write(f"{label}: {count}")
        self.stdout.write(self.style.SUCCESS("Supabase catalog cloned successfully."))
