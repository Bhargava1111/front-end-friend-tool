import os
import re
import uuid
from decimal import Decimal

from django.conf import settings
from datetime import timedelta

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import AppSetting, Profile, User
from accounts.permissions import IsAdminRole
from accounts.serializers import ProfileSerializer, UserSerializer
from blog.models import BlogPost
from catalog.models import Banner, Brand, Category, Product, ProductImage, ProductOfferPlacement, ProductVariant, Review
from catalog.placements import product_section_slugs
from catalog.pricing import normalize_price_tiers
from catalog.serializers import (
    BannerSerializer,
    BrandSerializer,
    CategorySerializer,
    CouponSerializer,
    OrderSerializer,
    ProductSerializer,
    ReviewSerializer,
)
from locations.models import StoreLocation
from notifications.models import Notification
from orders.models import Coupon, Order, OrderItem, OrderReturn
from orders.views import next_order_number
from storeops.services.notifications import notify_user


_UNIT_ALIASES = {
    "g": "g",
    "gram": "g",
    "grams": "g",
    "gm": "g",
    "kg": "kg",
    "kilo": "kg",
    "kilogram": "kg",
    "kilograms": "kg",
    "ml": "ml",
    "milliliter": "ml",
    "millilitre": "ml",
    "l": "l",
    "liter": "l",
    "litre": "l",
    "lt": "l",
    "pc": "pcs",
    "pcs": "pcs",
    "piece": "pcs",
    "pieces": "pcs",
    "pack": "pcs",
}


def _normalize_pack_unit(unit: str, fallback: str = "g") -> str:
    key = (unit or "").strip().lower()
    if key in _UNIT_ALIASES:
        return _UNIT_ALIASES[key]
    if key in {"g", "kg", "ml", "l", "pcs"}:
        return key
    return fallback


def _format_pack_label(unit_value: float, unit: str) -> str:
    if not unit_value or unit_value <= 0:
        return ""
    if unit == "l":
        display_value = int(unit_value) if unit_value == int(unit_value) else round(unit_value, 2)
        return f"{display_value} L"
    if unit == "pcs":
        display_value = int(unit_value) if unit_value == int(unit_value) else round(unit_value, 2)
        return f"{display_value} pc"
    display_value = int(unit_value) if unit in {"g", "ml"} else (
        int(unit_value) if unit_value == int(unit_value) else round(unit_value, 2)
    )
    return f"{display_value} {unit}"


def _normalize_variant_payload(v: dict) -> dict:
    label = str(v.get("label") or "").strip()
    unit = _normalize_pack_unit(str(v.get("unit") or ""))
    unit_value = float(v.get("unit_value") or 0)

    match = re.match(r"^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$", label)
    if match:
        parsed_value = float(match.group(1))
        parsed_unit = _normalize_pack_unit(match.group(2))
        if not unit_value or unit_value <= 0 or unit != parsed_unit:
            unit_value = parsed_value
            unit = parsed_unit

    if not unit_value or unit_value <= 0:
        unit_value = 1

    if not label:
        label = _format_pack_label(unit_value, unit)

    return {
        **v,
        "label": label,
        "unit": unit,
        "unit_value": unit_value,
    }


def _resolve_combo_category_id(data):
    subcategory_id = data.get("subcategory_id")
    if subcategory_id:
        return subcategory_id
    category_id = data.get("category_id")
    if category_id:
        return category_id
    link_slug = data.get("link_slug")
    if link_slug:
        category = Category.objects.filter(slug=link_slug).first()
        if category:
            return category.id
    return None


def _sync_combo_from_banner(data, product_id=None):
    placement = data.get("placement")
    combo_price = data.get("combo_price")
    if placement != "combos" and combo_price is None:
        return product_id

    from django.utils.text import slugify

    title = data.get("title") or "Combo pack"
    slug_base = slugify(data.get("combo_slug") or title) or "combo-pack"
    slug = slug_base
    suffix = 1
    while Product.objects.filter(slug=slug).exclude(id=product_id).exists():
        slug = f"{slug_base}-{suffix}"
        suffix += 1

    fields = {
        "name": title,
        "slug": slug,
        "description": data.get("subtitle") or "",
        "weight": "1 combo",
        "price": Decimal(str(combo_price or 0)),
        "mrp": Decimal(str(data["combo_mrp"])) if data.get("combo_mrp") not in (None, "") else None,
        "stock": int(data.get("combo_stock") or 50),
        "image_url": data.get("image_url") or "",
        "is_combo": True,
        "combo_items": data.get("combo_items") or [],
        "is_active": data.get("is_active", True),
    }
    category_id = _resolve_combo_category_id(data)
    if category_id:
        fields["category_id"] = category_id

    if product_id:
        Product.objects.filter(id=product_id).update(**fields)
        product = Product.objects.get(id=product_id)
    else:
        product = Product.objects.create(**fields)

    ProductOfferPlacement.objects.update_or_create(
        product=product,
        section="combo_packs",
        defaults={"sort_order": int(data.get("sort_order") or 0)},
    )
    return product.id


class AdminDashboardView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        today = timezone.now().date()
        all_orders = Order.objects.all()
        paid_orders = all_orders.exclude(status="cancelled")
        revenue = paid_orders.aggregate(s=Sum("total"))["s"] or 0
        order_count = all_orders.count()
        customer_count = User.objects.filter(role="customer").count()
        product_count = Product.objects.filter(is_active=True).count()
        low_stock_count = Product.objects.filter(stock__lte=5, is_active=True).count()
        avg_order = float(revenue) / order_count if order_count else 0

        # Last 14 days revenue chart
        start = today - timedelta(days=13)
        daily = (
            paid_orders.filter(created_at__date__gte=start)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(revenue=Sum("total"))
            .order_by("day")
        )
        daily_map = {str(r["day"]): float(r["revenue"] or 0) for r in daily}
        days = []
        for i in range(14):
            d = start + timedelta(days=i)
            key = str(d)
            days.append({"day": d.strftime("%d %b"), "revenue": daily_map.get(key, 0)})

        status_counts = list(
            all_orders.values("status").annotate(count=Count("id")).order_by("status")
        )

        top = (
            OrderItem.objects.values("product_name")
            .annotate(units=Sum("quantity"), revenue=Sum("line_total"))
            .order_by("-revenue")[:5]
        )
        top_products = [
            {"name": t["product_name"], "units": t["units"], "revenue": float(t["revenue"] or 0)}
            for t in top
        ]

        recent = Order.objects.prefetch_related("order_items").order_by("-created_at")[:8]
        recent_orders = OrderSerializer(recent, many=True).data

        return Response({
            "revenue": float(revenue),
            "orderCount": order_count,
            "customerCount": customer_count,
            "avgOrderValue": round(avg_order, 2),
            "productCount": product_count,
            "lowStock": low_stock_count,
            "days": days,
            "statusCounts": status_counts,
            "topProducts": top_products,
            "recentOrders": recent_orders,
            # legacy snake_case fields
            "revenue_today": float(
                paid_orders.filter(created_at__date=today).aggregate(s=Sum("total"))["s"] or 0
            ),
            "orders_today": all_orders.filter(created_at__date=today).count(),
            "pending_count": all_orders.filter(status="pending").count(),
        })


class AdminOrderListView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        qs = Order.objects.all().prefetch_related("order_items").order_by("-created_at")
        status = request.query_params.get("status")
        if status:
            qs = qs.filter(status=status)
        return Response(OrderSerializer(qs[:100], many=True).data)

    def post(self, request):
        user_id = request.data.get("user_id")
        user = User.objects.get(id=user_id) if user_id else request.user
        order = Order.objects.create(
            user=user,
            order_number=next_order_number(),
            subtotal=request.data.get("subtotal", 0),
            delivery_fee=request.data.get("delivery_fee", 0),
            total=request.data.get("total", 0),
            recipient_name=request.data.get("recipient_name", ""),
            phone=request.data.get("phone", ""),
            address_text=request.data.get("address_text", ""),
            status="pending",
        )
        return Response({"id": order.id}, status=201)


class AdminOrderDetailView(APIView):
    permission_classes = [IsAdminRole]

    def patch(self, request, pk):
        from storeops.services.audit import log_activity
        from storeops.services.notifications import notify_order_status

        order = Order.objects.get(id=pk)
        old_status = order.status
        if "status" in request.data:
            order.status = request.data["status"]
        if "delivery_date" in request.data:
            order.delivery_date = request.data["delivery_date"]
        order.save()
        if old_status != order.status:
            notify_order_status(order)
        log_activity(
            request.user,
            "order.update",
            "order",
            order.id,
            dict(request.data) if hasattr(request.data, "items") else request.data,
            request,
        )
        return Response(OrderSerializer(order).data)


class AdminProductView(APIView):
    permission_classes = [IsAdminRole]

    @staticmethod
    def _serialize_product(product):
        data = ProductSerializer(product).data
        data["gallery"] = data.get("images") or []
        data["variants"] = data.get("variants") or []
        data["offer_sections"] = product_section_slugs(product.id)
        return data

    def get(self, request):
        qs = Product.objects.all().prefetch_related("images", "variants", "offer_placements").order_by("-created_at")
        categories = Category.objects.all().order_by("sort_order")
        return Response({
            "products": [self._serialize_product(p) for p in qs],
            "categories": CategorySerializer(categories, many=True).data,
        })

    def post(self, request):
        data = request.data
        product_id = data.get("id")

        def text(key, default=""):
            val = data.get(key, default)
            return default if val is None else str(val)

        def optional_decimal(key):
            val = data.get(key)
            if val in (None, ""):
                return None
            return Decimal(str(val))

        fields = {
            "name": text("name"),
            "slug": text("slug"),
            "description": text("description"),
            "weight": text("weight"),
            "price": Decimal(str(data.get("price") or 0)),
            "mrp": optional_decimal("mrp"),
            "stock": int(data.get("stock") or 0),
            "image_url": text("image_url"),
            "video_url": text("video_url"),
            "shelf_life": text("shelf_life"),
            "origin": text("origin"),
            "is_active": data.get("is_active", True),
            "is_featured": data.get("is_featured", False),
            "is_best_seller": data.get("is_best_seller", False),
            "is_recommended": data.get("is_recommended", False),
            "is_combo": data.get("is_combo", False),
            "combo_items": data.get("combo_items") or [],
            "price_tiers": normalize_price_tiers(data.get("price_tiers") or []),
            "benefits": data.get("benefits") or [],
        }
        if data.get("category_id"):
            fields["category_id"] = data["category_id"]
        else:
            fields["category"] = None
        if data.get("brand_id"):
            fields["brand_id"] = data["brand_id"]

        try:
            if product_id:
                Product.objects.filter(id=product_id).update(**fields)
                product = Product.objects.get(id=product_id)
            else:
                product = Product.objects.create(**fields)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=400)

        images = data.get("images") or data.get("gallery") or []
        ProductImage.objects.filter(product=product).delete()
        for i, url in enumerate(images):
            if not url:
                continue
            ProductImage.objects.create(product=product, image_url=url, sort_order=i)

        variants = data.get("variants", [])
        if variants is not None:
            ProductVariant.objects.filter(product=product).delete()
            for v in variants:
                normalized = _normalize_variant_payload(v)
                ProductVariant.objects.create(
                    product=product,
                    label=normalized.get("label") or "",
                    unit=normalized.get("unit") or "",
                    unit_value=normalized.get("unit_value") or 1,
                    price=Decimal(str(normalized.get("price") or 0)),
                    mrp=(
                        Decimal(str(normalized["mrp"]))
                        if normalized.get("mrp") not in (None, "")
                        else None
                    ),
                    stock=int(normalized.get("stock") or 0),
                    sku=normalized.get("sku") or "",
                    image_url=normalized.get("image_url") or "",
                    is_default=bool(normalized.get("is_default", False)),
                    is_active=bool(normalized.get("is_active", True)),
                    sort_order=int(normalized.get("sort_order") or 0),
                )

        return Response({"id": product.id})

    def delete(self, request):
        Product.objects.filter(id=request.data.get("id")).delete()
        return Response(status=204)


class AdminProductPlacementView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request):
        product_ids = request.data.get("product_ids") or []
        section = request.data.get("section")
        action = request.data.get("action", "add")

        valid_sections = {key for key, _ in ProductOfferPlacement.Section.choices}
        if section not in valid_sections:
            return Response({"detail": "Invalid offer section."}, status=400)
        if not product_ids:
            return Response({"detail": "Select at least one product."}, status=400)

        products = Product.objects.filter(id__in=product_ids)
        if action == "remove":
            removed = ProductOfferPlacement.objects.filter(
                product_id__in=products.values_list("id", flat=True),
                section=section,
            ).delete()[0]
            return Response({"ok": True, "removed": removed})

        created = 0
        for i, product in enumerate(products):
            _, was_created = ProductOfferPlacement.objects.get_or_create(
                product=product,
                section=section,
                defaults={"sort_order": i},
            )
            if was_created:
                created += 1
        return Response({"ok": True, "added": created, "section": section})


class AdminCategoryView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        return Response(CategorySerializer(Category.objects.all().order_by("sort_order"), many=True).data)

    def post(self, request):
        data = request.data
        cid = data.get("id")
        fields = {
            k: data[k]
            for k in ("name", "slug", "description", "image_url", "sort_order", "is_active")
            if k in data
        }
        if data.get("parent_id"):
            fields["parent_id"] = data["parent_id"]
        elif "parent_id" in data and data["parent_id"] in (None, ""):
            fields["parent_id"] = None
        if cid:
            Category.objects.filter(id=cid).update(**fields)
        else:
            Category.objects.create(**fields)
        return Response({"ok": True})

    def delete(self, request):
        Category.objects.filter(id=request.data.get("id")).delete()
        return Response(status=204)


class AdminBannerView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        qs = Banner.objects.select_related("product").all().order_by("sort_order")
        return Response(BannerSerializer(qs, many=True).data)

    def post(self, request):
        data = request.data
        bid = data.get("id")
        product_id = data.get("product_id")

        if data.get("placement") == "combos":
            existing = Banner.objects.filter(id=bid).first() if bid else None
            product_id = _sync_combo_from_banner(data, product_id=existing.product_id if existing else None)
            category_id = _resolve_combo_category_id(data)
            if category_id:
                category = Category.objects.filter(id=category_id).first()
                if category:
                    data = {**data, "link_slug": category.slug}

        fields = {
            k: data[k]
            for k in ("title", "subtitle", "image_url", "link_slug", "sort_order", "is_active", "placement")
            if k in data
        }
        if data.get("brand_id"):
            fields["brand_id"] = data["brand_id"]
        if data.get("coupon_id"):
            fields["coupon_id"] = data["coupon_id"]
        if product_id:
            fields["product_id"] = product_id
        if bid:
            Banner.objects.filter(id=bid).update(**fields)
        else:
            Banner.objects.create(**fields)
        return Response({"ok": True})

    def delete(self, request):
        Banner.objects.filter(id=request.data.get("id")).delete()
        return Response(status=204)


class AdminBrandView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        return Response(BrandSerializer(Brand.objects.all().order_by("sort_order"), many=True).data)

    def post(self, request):
        data = request.data
        bid = data.get("id")
        fields = {k: data[k] for k in ("name", "slug", "tagline", "logo_url", "banner_url", "sort_order", "is_active") if k in data}
        if bid:
            Brand.objects.filter(id=bid).update(**fields)
        else:
            Brand.objects.create(**fields)
        return Response({"ok": True})

    def delete(self, request):
        Brand.objects.filter(id=request.data.get("id")).delete()
        return Response(status=204)


class AdminCouponView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        return Response(CouponSerializer(Coupon.objects.all(), many=True).data)

    def post(self, request):
        data = request.data
        cid = data.get("id")
        fields = {k: data[k] for k in ("code", "title", "description", "discount_type", "discount_value", "min_order", "max_discount", "banner_url", "is_active", "ends_at") if k in data}
        if cid:
            Coupon.objects.filter(id=cid).update(**fields)
        else:
            Coupon.objects.create(**fields)
        return Response({"ok": True})

    def delete(self, request):
        Coupon.objects.filter(id=request.data.get("id")).delete()
        return Response(status=204)


class AdminStoreView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        stores = StoreLocation.objects.all()
        return Response([{
            "id": s.id, "name": s.name, "address_text": s.address_text, "city": s.city,
            "state": s.state, "pincode": s.pincode, "latitude": s.latitude, "longitude": s.longitude,
            "phone": s.phone, "opening_hours": s.opening_hours,
            "delivery_radius_km": float(s.delivery_radius_km), "is_active": s.is_active,
        } for s in stores])

    def post(self, request):
        data = request.data
        sid = data.get("id")
        fields = {k: data[k] for k in ("name", "address_text", "city", "state", "pincode", "latitude", "longitude", "phone", "opening_hours", "delivery_radius_km", "is_active") if k in data}
        if sid:
            StoreLocation.objects.filter(id=sid).update(**fields)
        else:
            StoreLocation.objects.create(**fields)
        return Response({"ok": True})

    def delete(self, request):
        StoreLocation.objects.filter(id=request.data.get("id")).delete()
        return Response(status=204)


class AdminCustomerListView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        users = User.objects.filter(role="customer").annotate(
            order_count=Count("orders"),
            total_spend=Sum("orders__total"),
        )
        return Response([{
            "id": str(u.id),
            "full_name": u.full_name,
            "phone": u.phone,
            "email": u.email,
            "orders": u.order_count,
            "spend": float(u.total_spend or 0),
            "order_count": u.order_count,
            "total_spend": float(u.total_spend or 0),
            "created_at": u.date_joined.isoformat(),
        } for u in users])


class AdminCustomerDetailView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request, pk):
        from accounts.models import Address
        from orders.models import CartItem, WishlistItem

        user = User.objects.get(id=pk)
        profile = Profile.objects.filter(user=user).first()
        orders = Order.objects.filter(user=user).order_by("-created_at")
        non_cancelled = orders.exclude(status="cancelled")
        spend = non_cancelled.aggregate(s=Sum("total"))["s"] or 0
        count = non_cancelled.count()
        items = OrderItem.objects.filter(order__user=user).values(
            "order_id", "product_name", "variant_label", "quantity", "line_total"
        )[:100]
        addresses = Address.objects.filter(user=user).values(
            "id", "label", "recipient_name", "phone", "line1", "line2", "city", "state", "pincode", "is_default"
        )
        returns = OrderReturn.objects.filter(user=user).values(
            "id", "order_id", "reason", "details", "status", "created_at"
        )
        return Response({
            "profile": {
                "id": str(user.id),
                "full_name": user.full_name,
                "phone": user.phone,
                "avatar_url": profile.avatar_url if profile else "",
                "created_at": user.date_joined.isoformat(),
            },
            "email": user.email,
            "lastSignInAt": user.last_login.isoformat() if user.last_login else None,
            "stats": {
                "orders": orders.count(),
                "cancelled": orders.filter(status="cancelled").count(),
                "spend": float(spend),
                "avg": float(spend / count) if count else 0,
                "lastOrderAt": orders.first().created_at.isoformat() if orders.exists() else None,
                "cartCount": CartItem.objects.filter(user=user).count(),
                "wishlistCount": WishlistItem.objects.filter(user=user).count(),
            },
            "orders": OrderSerializer(orders[:20], many=True).data,
            "items": [
                {
                    "order_id": str(i["order_id"]),
                    "product_name": i["product_name"],
                    "variant_label": i["variant_label"],
                    "quantity": i["quantity"],
                    "line_total": float(i["line_total"]),
                }
                for i in items
            ],
            "reviews": [],
            "addresses": list(addresses),
            "returns": [
                {
                    "id": str(r["id"]),
                    "order_id": str(r["order_id"]),
                    "reason": r["reason"],
                    "details": r["details"],
                    "status": r["status"],
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                }
                for r in returns
            ],
        })


class AdminUserVerificationView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        status_filter = request.query_params.get("status")
        qs = Profile.objects.select_related("user").filter(user__role="customer")
        if status_filter:
            qs = qs.filter(verification_status=status_filter)
        return Response([{
            "id": str(p.user_id),
            "full_name": p.user.full_name,
            "phone": p.user.phone,
            "verification_status": p.verification_status,
            "address_text": p.address_text,
            "pincode": p.pincode,
            "latitude": p.latitude,
            "longitude": p.longitude,
            "location_accuracy_m": p.location_accuracy_m,
            "rejection_reason": p.rejection_reason,
            "submitted_at": p.submitted_at.isoformat() if p.submitted_at else None,
            "created_at": p.user.date_joined.isoformat(),
        } for p in qs])

    def patch(self, request, pk):
        profile = Profile.objects.get(user_id=pk)
        status = request.data.get("status", profile.verification_status)
        profile.verification_status = status
        profile.rejection_reason = request.data.get("note", "")
        if profile.verification_status == "verified":
            profile.verified_at = timezone.now()
            Notification.objects.create(
                user=profile.user,
                title="Account verified",
                body="Your account has been verified. You can now place orders.",
                type=Notification.Type.SYSTEM,
            )
        elif profile.verification_status == "rejected":
            Notification.objects.create(
                user=profile.user,
                title="Verification update",
                body=profile.rejection_reason or "Please resubmit your details for review.",
                type=Notification.Type.SYSTEM,
            )
        profile.save()
        return Response(ProfileSerializer(profile).data)


class AdminSettingsView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        rows = AppSetting.objects.all()
        return Response([{"key": r.key, "value": r.value} for r in rows])

    def post(self, request):
        entries = request.data.get("entries")
        if entries:
            for entry in entries:
                AppSetting.objects.update_or_create(
                    key=entry["key"],
                    defaults={"value": entry["value"]},
                )
        else:
            for key, value in request.data.items():
                if key != "entries":
                    AppSetting.objects.update_or_create(key=key, defaults={"value": value})
        return Response({"ok": True})


class AdminReviewView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        return Response(ReviewSerializer(Review.objects.all().order_by("-created_at"), many=True).data)

    def delete(self, request):
        Review.objects.filter(id=request.data.get("id")).delete()
        return Response(status=204)


class AdminReturnView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        returns = OrderReturn.objects.select_related("order", "user").order_by("-created_at")
        return Response([{
            "id": str(r.id),
            "order_id": str(r.order_id),
            "order_number": r.order.order_number,
            "order_total": float(r.order.total),
            "customer": r.user.full_name or r.user.phone or r.user.email,
            "reason": r.reason,
            "details": r.details,
            "status": r.status,
            "created_at": r.created_at.isoformat(),
        } for r in returns])

    def patch(self, request):
        from storeops.services.audit import log_activity

        ret = OrderReturn.objects.get(id=request.data.get("id"))
        ret.status = request.data.get("status", ret.status)
        ret.save()
        log_activity(request.user, "return.update", "return", ret.id, request.data, request)
        return Response({"ok": True})


class AdminSalesReportView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        from django.db.models.functions import TruncMonth, TruncWeek
        from django.utils.dateparse import parse_date

        today = timezone.now().date()
        from_date = parse_date(request.query_params.get("from", "")) or (today - timedelta(days=29))
        to_date = parse_date(request.query_params.get("to", "")) or today
        granularity = request.query_params.get("granularity", "day")

        orders_qs = Order.objects.filter(
            created_at__date__gte=from_date,
            created_at__date__lte=to_date,
        ).prefetch_related("order_items").order_by("-created_at")

        paid_orders = orders_qs.exclude(status="cancelled")
        revenue = paid_orders.aggregate(s=Sum("total"))["s"] or 0
        order_count = paid_orders.count()
        cancelled = orders_qs.filter(status="cancelled").count()
        avg_order = float(revenue) / order_count if order_count else 0

        trunc_map = {
            "day": TruncDate,
            "week": TruncWeek,
            "month": TruncMonth,
        }
        trunc_fn = trunc_map.get(granularity, TruncDate)
        bucket_rows = (
            paid_orders.annotate(bucket=trunc_fn("created_at"))
            .values("bucket")
            .annotate(revenue=Sum("total"), orders=Count("id"))
            .order_by("bucket")
        )
        buckets = [
            {
                "bucket": r["bucket"].strftime("%Y-%m-%d") if r["bucket"] else "",
                "revenue": float(r["revenue"] or 0),
                "orders": r["orders"],
            }
            for r in bucket_rows
        ]

        top = (
            OrderItem.objects.filter(
                order__created_at__date__gte=from_date,
                order__created_at__date__lte=to_date,
            )
            .exclude(order__status="cancelled")
            .values("product_name")
            .annotate(qty=Sum("quantity"), revenue=Sum("line_total"))
            .order_by("-revenue")[:10]
        )
        top_products = [
            {"name": t["product_name"], "qty": t["qty"], "revenue": float(t["revenue"] or 0)}
            for t in top
        ]

        return Response({
            "totals": {
                "revenue": float(revenue),
                "orders": order_count,
                "avgOrderValue": avg_order,
                "cancelled": cancelled,
            },
            "buckets": buckets,
            "topProducts": top_products,
            "orders": OrderSerializer(orders_qs, many=True).data,
            "status_counts": list(orders_qs.values("status").annotate(count=Count("id"))),
        })


class MediaUploadView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "No file."}, status=400)
        folder = request.data.get("folder", "uploads")
        ext = os.path.splitext(file.name)[1]
        filename = f"{folder}/{uuid.uuid4().hex}{ext}"
        path = os.path.join(settings.MEDIA_ROOT, filename)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            for chunk in file.chunks():
                f.write(chunk)
        url = request.build_absolute_uri(settings.MEDIA_URL + filename)
        return Response({"id": uuid.uuid4(), "url": url, "path": filename, "content_type": file.content_type, "size": file.size}, status=201)


class AdminBroadcastNotificationView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request):
        title = (request.data.get("title") or "").strip()
        body = (request.data.get("body") or "").strip()
        image_url = (request.data.get("image_url") or "").strip()
        audience = request.data.get("audience", "all")

        if not title or not body:
            return Response({"detail": "Title and body are required."}, status=400)

        if audience == "admins":
            users = User.objects.filter(role="admin")
        else:
            users = User.objects.filter(role="customer")

        sent = 0
        for user in users:
            notify_user(
                user,
                title[:120],
                body[:2000],
                Notification.Type.PROMO,
                link="/offers",
                image_url=image_url[:500],
            )
            sent += 1

        return Response({"ok": True, "sent": sent})
