import os

from django.core.management.base import BaseCommand
from django.conf import settings

from accounts.models import Profile, User
from notifications.models import Notification


DEMO_PASSWORD = "Demo@12345"
ADMINS = [
    ("admin@mnxstore.in", "+919000000001", "Super Admin"),
    ("manager@mnxstore.in", "+919000000002", "Store Manager"),
    ("orders@mnxstore.in", "+919000000003", "Order Desk"),
]
CUSTOMERS = [
    ("ananya@example.com", "+919111100001", "Ananya Iyer"),
    ("ravi@example.com", "+919111100002", "Ravi Kumar"),
    ("meera@example.com", "+919111100003", "Meera Nair"),
]


class Command(BaseCommand):
    help = "Seed demo accounts and sample catalog data"

    def handle(self, *args, **options):
        if not settings.DEBUG and not os.getenv("ALLOW_DEMO_SEED"):
            raise SystemExit("Refusing to seed demo accounts in production")

        for email, phone, name in ADMINS:
            user, created = User.objects.get_or_create(
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
            user.save()
            self.stdout.write(f"{'Created' if created else 'Updated'} admin: {email}")

        for email, phone, name in CUSTOMERS:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "phone": phone,
                    "full_name": name,
                    "role": "customer",
                    "is_phone_verified": True,
                },
            )
            user.set_password(DEMO_PASSWORD)
            user.save()
            profile = Profile.objects.get(user=user)
            profile.verification_status = "verified"
            profile.verified_at = profile.verified_at or __import__("django.utils.timezone", fromlist=["now"]).now()
            profile.save()
            self.stdout.write(f"{'Created' if created else 'Updated'} customer: {email}")

        from django.core.management import call_command

        try:
            call_command("import_supabase_catalog", reset=True)
            self.stdout.write("Imported full Supabase catalog")
        except Exception as exc:
            # Users/admins above must still succeed even if catalog import fails.
            self.stderr.write(self.style.WARNING(f"Catalog import skipped/failed: {exc}"))

        # Welcome notifications for demo users
        for email, phone, name in CUSTOMERS + ADMINS:
            user = User.objects.filter(email=email).first()
            if not user:
                continue
            if not Notification.objects.filter(user=user, title="Welcome to Sri Mahalakshmi Stores").exists():
                Notification.objects.create(
                    user=user,
                    title="Welcome to Sri Mahalakshmi Stores",
                    body=f"Hi {name.split()[0]}, browse groceries & pooja essentials with 60-min delivery.",
                    type=Notification.Type.SYSTEM,
                )
            if not Notification.objects.filter(user=user, title="Free delivery above ₹499").exists():
                Notification.objects.create(
                    user=user,
                    title="Free delivery above ₹499",
                    body="Add a few more items to your cart and skip the delivery fee.",
                    type=Notification.Type.PROMO,
                )
        self.stdout.write("Created welcome notifications")

        self._seed_demo_orders()
        self.stdout.write(self.style.SUCCESS("Demo data seeded. Password: Demo@12345, OTP: 123456"))

    def _seed_demo_orders(self):
        from decimal import Decimal

        from catalog.models import Product
        from orders.models import Order, OrderItem
        from orders.views import next_order_number

        if Order.objects.exists():
            self.stdout.write("Demo orders already present — skipped")
            return

        products = list(Product.objects.filter(is_active=True).order_by("name")[:4])
        if not products:
            self.stdout.write("No products found — skipped demo orders")
            return

        customers = list(User.objects.filter(role="customer").order_by("date_joined")[:3])
        if not customers:
            self.stdout.write("No customers found — skipped demo orders")
            return

        samples = [
            ("pending", customers[0]),
            ("confirmed", customers[min(1, len(customers) - 1)]),
            ("delivered", customers[min(2, len(customers) - 1)]),
        ]

        for i, (status, customer) in enumerate(samples):
            product = products[i % len(products)]
            price = product.price
            qty = 2 if status != "delivered" else 1
            subtotal = price * qty
            delivery = Decimal("40")
            total = subtotal + delivery
            order = Order.objects.create(
                user=customer,
                order_number=next_order_number(),
                status=status,
                subtotal=subtotal,
                delivery_fee=delivery,
                total=total,
                payment_method="cod",
                payment_status="paid" if status == "delivered" else "pending",
                recipient_name=customer.full_name or "Customer",
                phone=customer.phone or "",
                address_text="4th Cross Road, KR Puram, Bengaluru, Karnataka — 560036",
            )
            OrderItem.objects.create(
                order=order,
                product=product,
                product_name=product.name,
                product_weight=product.weight or "",
                image_url=product.image_url or "",
                unit_price=price,
                quantity=qty,
                line_total=price * qty,
            )
            self.stdout.write(f"Created demo order {order.order_number} ({status})")
