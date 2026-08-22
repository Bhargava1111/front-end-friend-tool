import os
import re
import uuid
from decimal import Decimal

from django.conf import settings
from datetime import timedelta

from django.db.models import Count, Max, Q, Sum
from django.shortcuts import get_object_or_404
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import AppSetting, Profile, User
from accounts.permissions import IsAdminRole
from accounts.serializers import ProfileSerializer, UserSerializer
from blog.models import BlogPost
from catalog.models import Banner, Brand, Category, HomeOfferSection, Product, ProductImage, ProductOfferPlacement, ProductVariant, Review
from catalog.cache_utils import invalidate_catalog_cache
from catalog.placements import product_section_slugs
from catalog.pricing import normalize_price_tiers
from catalog.serializers import (
    BannerSerializer,
    BrandSerializer,
    CategorySerializer,
    CouponSerializer,
    HomeOfferSectionSerializer,
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
        qs = Order.objects.select_related("user").prefetch_related("order_items")
        status = request.query_params.get("status")
        user_id = request.query_params.get("user_id") or request.query_params.get("customer")
        open_only = request.query_params.get("open") in ("1", "true", "yes")
        sort = request.query_params.get("sort", "newest")
        date = request.query_params.get("date")
        day = request.query_params.get("day")

        if status:
            qs = qs.filter(status=status)
        if user_id:
            qs = qs.filter(user_id=user_id)
        if open_only:
            qs = qs.filter(status__in=["pending", "confirmed", "packed", "out_for_delivery"])

        today = timezone.localdate()
        if day == "today":
            qs = qs.filter(created_at__date=today)
        elif day == "yesterday":
            qs = qs.filter(created_at__date=today - timedelta(days=1))
        elif day == "week":
            qs = qs.filter(created_at__date__gte=today - timedelta(days=7))
        elif date:
            qs = qs.filter(created_at__date=date)

        qs = qs.order_by("created_at" if sort == "oldest" else "-created_at")
        return Response(OrderSerializer(qs[:200], many=True).data)

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


class AdminOrderBulkView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request):
        from storeops.services.audit import log_activity
        from storeops.services.notifications import notify_order_status

        order_ids = request.data.get("order_ids") or []
        action = request.data.get("action", "approve")
        delivery_date = request.data.get("delivery_date")
        explicit_status = request.data.get("status") or (
            action if action in dict(Order.Status.choices) else None
        )

        status_map = {
            "approve": "confirmed",
            "confirm": "confirmed",
            "confirmed": "confirmed",
            "reject": "cancelled",
            "cancel": "cancelled",
            "cancelled": "cancelled",
            "pack": "packed",
            "packed": "packed",
            "deliver": "delivered",
            "delivered": "delivered",
            "out_for_delivery": "out_for_delivery",
            "pending": "pending",
        }
        if explicit_status and explicit_status in dict(Order.Status.choices):
            new_status = explicit_status
        else:
            new_status = status_map.get(action, action)
        if new_status not in dict(Order.Status.choices):
            return Response({"detail": f"Invalid action: {action}"}, status=400)

        if not order_ids:
            if action in ("approve", "confirm"):
                qs = Order.objects.filter(status="pending")
            else:
                return Response({"detail": "order_ids required"}, status=400)
        else:
            qs = Order.objects.filter(id__in=order_ids)

        updated = 0
        changed = 0
        results = []
        for order in qs:
            old_status = order.status
            order.status = new_status
            if delivery_date and new_status == "confirmed":
                order.delivery_date = delivery_date
            order.save(update_fields=["status", "delivery_date", "updated_at"])
            if old_status != order.status:
                notify_order_status(order)
                changed += 1
            updated += 1
            results.append({"id": str(order.id), "status": order.status})

        log_activity(
            request.user,
            "order.bulk_update",
            "order",
            "",
            {"action": action, "status": new_status, "count": changed, "order_ids": [str(i) for i in order_ids]},
            request,
        )
        return Response({"ok": True, "updated": updated, "changed": changed, "status": new_status, "orders": results})


class AdminOrderDetailView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        return self._apply_update(request, pk)

    def patch(self, request, pk):
        return self._apply_update(request, pk)

    def _apply_update(self, request, pk):
        from storeops.services.audit import log_activity
        from storeops.services.notifications import notify_order_status

        order = Order.objects.get(id=pk)
        old_status = order.status
        update_fields = ["updated_at"]
        if "status" in request.data:
            new_status = request.data["status"]
            if new_status not in dict(Order.Status.choices):
                return Response({"detail": f"Invalid status: {new_status}"}, status=400)
            order.status = new_status
            update_fields.append("status")
        if "delivery_date" in request.data:
            order.delivery_date = request.data["delivery_date"] or None
            update_fields.append("delivery_date")
        order.save(update_fields=update_fields)
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
    def _serialize_product(product, offer_sections=None):
        data = ProductSerializer(product).data
        data["gallery"] = data.get("images") or []
        data["variants"] = data.get("variants") or []
        data["offer_sections"] = offer_sections if offer_sections is not None else product_section_slugs(product.id)
        return data

    def get(self, request):
        qs = Product.objects.all().prefetch_related("images", "variants", "offer_placements").order_by("-created_at")
        placements_map: dict[str, list[str]] = {}
        for product_id, section in ProductOfferPlacement.objects.values_list("product_id", "section").order_by(
            "sort_order"
        ):
            placements_map.setdefault(str(product_id), []).append(section)
        categories = Category.objects.all().order_by("sort_order")
        return Response({
            "products": [
                {
                    **self._serialize_product(p, placements_map.get(str(p.id), [])),
                }
                for p in qs
            ],
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
        if isinstance(images, str):
            images = [u.strip() for u in images.replace(",", "\n").splitlines() if u.strip()]
        ProductImage.objects.filter(product=product).delete()
        for i, url in enumerate(images):
            if not url:
                continue
            ProductImage.objects.create(product=product, image_url=str(url), sort_order=i)
        if images and not product.image_url:
            product.image_url = str(images[0])
            product.save(update_fields=["image_url"])

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

        valid_sections = set(HomeOfferSection.objects.filter(is_active=True).values_list("key", flat=True))
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
            invalidate_catalog_cache()
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
        invalidate_catalog_cache()
        return Response({"ok": True, "added": created, "section": section})


class AdminHomeSectionView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        from catalog.placements import all_section_products
        sections_map = all_section_products(limit=40)
        qs = HomeOfferSection.objects.all().order_by("sort_order", "title")
        return Response(
            HomeOfferSectionSerializer(qs, many=True, context={"sections_map": sections_map}).data
        )

    def post(self, request):
        data = request.data
        action = data.get("action")
        if action in ("move", "reorder"):
            return self._handle_section_reorder(data)
        if action == "sync_defaults":
            from catalog.home_sections_defaults import ensure_default_home_sections, apply_canonical_sort_order
            from catalog.cache_utils import invalidate_catalog_cache

            created = ensure_default_home_sections()
            if created == 0:
                apply_canonical_sort_order()
            total = HomeOfferSection.objects.count()
            invalidate_catalog_cache()
            return Response({"ok": True, "created": created, "total": total})

        sid = data.get("id")
        key = (data.get("key") or "").strip().lower().replace(" ", "_")
        title = (data.get("title") or "").strip()
        if not key and not sid and title:
            key = re.sub(r"[^a-z0-9_]+", "_", title.lower()).strip("_")[:50]
        fields = {}
        for field in (
            "key", "title", "subtitle", "layout", "fallback_rule",
            "see_all_tab", "max_price", "max_products", "sort_order", "is_active", "show_on_home",
        ):
            if field in data and data[field] is not None:
                val = data[field]
                if field in ("key", "title", "subtitle", "see_all_tab") and isinstance(val, str):
                    val = val.strip()
                if field == "key" and not val:
                    continue
                fields[field] = val
        if key:
            fields["key"] = key
        if sid:
            section = get_object_or_404(HomeOfferSection, id=sid)
            for k, v in fields.items():
                setattr(section, k, v)
            section.save()
        else:
            if not fields.get("title"):
                return Response({"detail": "Title is required."}, status=400)
            if not fields.get("key"):
                fields["key"] = re.sub(r"[^a-z0-9_]+", "_", fields["title"].lower()).strip("_")[:50]
            if not fields.get("key"):
                return Response({"detail": "Could not generate section key from title."}, status=400)
            if HomeOfferSection.objects.filter(key=fields["key"]).exists():
                return Response({"detail": "Section key already exists."}, status=400)
            if "sort_order" not in fields:
                max_sort = HomeOfferSection.objects.order_by("-sort_order").values_list("sort_order", flat=True).first()
                fields["sort_order"] = (max_sort or 0) + 1
            section = HomeOfferSection.objects.create(**fields)
        invalidate_catalog_cache()
        return Response(HomeOfferSectionSerializer(section).data)

    def delete(self, request):
        sid = request.data.get("id")
        section = get_object_or_404(HomeOfferSection, id=sid)
        key = section.key
        section.delete()
        ProductOfferPlacement.objects.filter(section=key).delete()
        invalidate_catalog_cache()
        return Response(status=204)

    def patch(self, request):
        return self._handle_section_reorder(request.data)

    def _handle_section_reorder(self, data):
        action = data.get("action")
        if action == "move":
            section_id = data.get("id")
            direction = data.get("direction")
            sections = list(HomeOfferSection.objects.all().order_by("sort_order", "title"))
            for i, section in enumerate(sections):
                section.sort_order = i
            idx = next((i for i, s in enumerate(sections) if str(s.id) == str(section_id)), None)
            if idx is None:
                return Response({"detail": "Section not found"}, status=404)
            if direction == "up" and idx > 0:
                sections[idx], sections[idx - 1] = sections[idx - 1], sections[idx]
            elif direction == "down" and idx < len(sections) - 1:
                sections[idx], sections[idx + 1] = sections[idx + 1], sections[idx]
            else:
                return Response({"ok": True, "moved": False})
            for i, section in enumerate(sections):
                section.sort_order = i
            HomeOfferSection.objects.bulk_update(sections, ["sort_order"])
            invalidate_catalog_cache()
            return Response({"ok": True, "moved": True})

        if action == "reorder":
            ordered_ids = [str(sid) for sid in (data.get("ordered_ids") or [])]
            if not ordered_ids:
                return Response({"detail": "ordered_ids required"}, status=400)
            by_id = {str(s.id): s for s in HomeOfferSection.objects.all()}
            ordered = [by_id[sid] for sid in ordered_ids if sid in by_id]
            if not ordered:
                return Response({"detail": "No matching sections"}, status=400)
            seen = {str(s.id) for s in ordered}
            tail = [s for s in HomeOfferSection.objects.all().order_by("sort_order", "title") if str(s.id) not in seen]
            sections = ordered + tail
            for i, section in enumerate(sections):
                section.sort_order = i
            HomeOfferSection.objects.bulk_update(sections, ["sort_order"])
            invalidate_catalog_cache()
            return Response({"ok": True, "reordered": len(ordered_ids)})

        return Response({"detail": "Unknown action"}, status=400)


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

        fields = {}
        for key in ("title", "subtitle", "image_url", "link_slug", "sort_order", "is_active", "placement"):
            if key not in data:
                continue
            value = data[key]
            if value is None and key in ("title", "subtitle", "image_url", "link_slug"):
                value = ""
            fields[key] = value
        if data.get("brand_id"):
            fields["brand_id"] = data["brand_id"]
        elif "brand_id" in data and not data.get("brand_id"):
            fields["brand_id"] = None
        if data.get("coupon_id"):
            fields["coupon_id"] = data["coupon_id"]
        elif "coupon_id" in data and not data.get("coupon_id"):
            fields["coupon_id"] = None
        if product_id:
            fields["product_id"] = product_id
        try:
            if bid:
                Banner.objects.filter(id=bid).update(**fields)
            else:
                Banner.objects.create(**fields)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=400)
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
        users = (
            User.objects.filter(role="customer")
            .annotate(
                order_count=Count("orders", distinct=True),
                total_spend=Sum("orders__total"),
            )
            .order_by("-date_joined")
        )
        profiles = {p.user_id: p for p in Profile.objects.filter(user__in=users)}
        return Response([{
            "id": str(u.id),
            "full_name": u.full_name,
            "phone": u.phone,
            "email": u.email,
            "is_active": u.is_active,
            "avatar_url": getattr(profiles.get(u.id), "avatar_url", "") or "",
            "gst_number": getattr(profiles.get(u.id), "gst_number", "") or "",
            "verification_status": getattr(profiles.get(u.id), "verification_status", "pending"),
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

        user = get_object_or_404(User, id=pk)
        profile = Profile.objects.filter(user=user).first()
        stats_row = Order.objects.filter(user=user).aggregate(
            orders=Count("id"),
            cancelled=Count("id", filter=Q(status="cancelled")),
            spend=Sum("total", filter=~Q(status="cancelled")),
            last_order_at=Max("created_at"),
        )
        recent_orders = list(Order.objects.filter(user=user).order_by("-created_at")[:20])
        spend = stats_row["spend"] or 0
        paid_count = (stats_row["orders"] or 0) - (stats_row["cancelled"] or 0)
        items = OrderItem.objects.filter(order__user=user).values(
            "order_id", "product_name", "variant_label", "quantity", "line_total"
        )[:100]
        addresses = [
            {
                **row,
                "id": str(row["id"]),
            }
            for row in Address.objects.filter(user=user).values(
                "id",
                "label",
                "recipient_name",
                "phone",
                "line1",
                "line2",
                "landmark",
                "city",
                "state",
                "pincode",
                "latitude",
                "longitude",
                "is_default",
            )
        ]
        if profile and profile.address_text and not addresses:
            addresses = [{
                "id": "profile-address",
                "label": "Submitted for verification",
                "recipient_name": user.full_name or "Customer",
                "phone": user.phone or "",
                "line1": profile.address_text,
                "line2": "",
                "landmark": "",
                "city": "",
                "state": "",
                "pincode": profile.pincode or "",
                "latitude": profile.latitude,
                "longitude": profile.longitude,
                "is_default": True,
            }]
        returns = OrderReturn.objects.filter(user=user).values(
            "id", "order_id", "reason", "details", "status", "created_at"
        )
        return Response({
            "profile": {
                "id": str(user.id),
                "full_name": user.full_name,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "phone": user.phone,
                "email": user.email,
                "avatar_url": profile.avatar_url if profile else "",
                "gst_number": profile.gst_number if profile else "",
                "alt_phone": profile.alt_phone if profile else "",
                "dob": profile.dob.isoformat() if profile and profile.dob else None,
                "created_at": user.date_joined.isoformat(),
                "is_active": user.is_active,
                "verification_status": profile.verification_status if profile else "pending",
                "address_text": profile.address_text if profile else "",
                "pincode": profile.pincode if profile else "",
                "latitude": float(profile.latitude) if profile and profile.latitude is not None else None,
                "longitude": float(profile.longitude) if profile and profile.longitude is not None else None,
                "location_accuracy_m": profile.location_accuracy_m if profile else None,
                "rejection_reason": profile.rejection_reason if profile else "",
                "submitted_at": profile.submitted_at.isoformat() if profile and profile.submitted_at else None,
                "verified_at": profile.verified_at.isoformat() if profile and profile.verified_at else None,
            },
            "email": user.email,
            "lastSignInAt": user.last_login.isoformat() if user.last_login else None,
            "stats": {
                "orders": stats_row["orders"] or 0,
                "cancelled": stats_row["cancelled"] or 0,
                "spend": float(spend),
                "avg": float(spend / paid_count) if paid_count else 0,
                "lastOrderAt": stats_row["last_order_at"].isoformat() if stats_row["last_order_at"] else None,
                "cartCount": CartItem.objects.filter(user=user).count(),
                "wishlistCount": WishlistItem.objects.filter(user=user).count(),
            },
            "orders": [
                {
                    "id": str(o.id),
                    "order_number": o.order_number,
                    "status": o.status,
                    "total": float(o.total or 0),
                    "payment_method": o.payment_method,
                    "delivery_slot": o.delivery_slot,
                    "created_at": o.created_at.isoformat(),
                    "recipient_name": o.recipient_name,
                    "phone": o.phone,
                    "address_text": o.address_text,
                }
                for o in recent_orders
            ],
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

    def _serialize_profile(self, profile, stats=None):
        stats = stats or {}
        return {
            "id": str(profile.user_id),
            "full_name": profile.user.full_name,
            "phone": profile.user.phone,
            "email": profile.user.email,
            "is_active": profile.user.is_active,
            "avatar_url": profile.avatar_url or "",
            "gst_number": profile.gst_number or "",
            "alt_phone": profile.alt_phone or "",
            "dob": profile.dob.isoformat() if profile.dob else None,
            "verification_status": profile.verification_status,
            "address_text": profile.address_text,
            "pincode": profile.pincode,
            "latitude": profile.latitude,
            "longitude": profile.longitude,
            "location_accuracy_m": profile.location_accuracy_m,
            "rejection_reason": profile.rejection_reason,
            "submitted_at": profile.submitted_at.isoformat() if profile.submitted_at else None,
            "verified_at": profile.verified_at.isoformat() if profile.verified_at else None,
            "created_at": profile.user.date_joined.isoformat(),
            "order_count": int(stats.get("order_count") or 0),
            "total_spend": float(stats.get("total_spend") or 0),
        }

    def get(self, request):
        status_filter = (request.query_params.get("status") or "").strip().lower()
        q = (request.query_params.get("q") or "").strip()
        qs = (
            Profile.objects.select_related("user")
            .filter(user__role="customer")
            .exclude(user__full_name="Deleted User")
            .annotate(
                order_count=Count("user__orders", distinct=True),
                total_spend=Sum("user__orders__total", filter=~Q(user__orders__status="cancelled")),
            )
            .order_by("-user__date_joined")
        )
        if status_filter and status_filter != "all":
            if status_filter == "blocked":
                qs = qs.filter(user__is_active=False)
            else:
                qs = qs.filter(verification_status=status_filter)
        if q:
            qs = qs.filter(
                Q(user__full_name__icontains=q)
                | Q(user__phone__icontains=q)
                | Q(user__email__icontains=q)
                | Q(gst_number__icontains=q)
                | Q(pincode__icontains=q)
                | Q(address_text__icontains=q)
                | Q(alt_phone__icontains=q)
            )
        return Response([
            self._serialize_profile(
                p,
                {"order_count": p.order_count, "total_spend": p.total_spend},
            )
            for p in qs
        ])

    def post(self, request):
        data = request.data
        email = (data.get("email") or "").strip()
        phone = (data.get("phone") or "").strip()
        password = data.get("password") or ""
        full_name = (data.get("full_name") or "").strip()
        role = (data.get("role") or User.Role.CUSTOMER).strip().lower()
        address_text = (data.get("address_text") or "").strip()
        verified = bool(data.get("verified", True))

        if not email or not password or not full_name:
            return Response({"detail": "Email, password and full name are required."}, status=400)
        if not phone:
            return Response({"detail": "Phone is required."}, status=400)
        if User.objects.filter(email__iexact=email).exists():
            return Response({"detail": "Email already in use."}, status=400)
        if User.objects.filter(phone=phone).exists():
            return Response({"detail": "Phone already in use."}, status=400)

        is_admin = role == User.Role.ADMIN
        user = User.objects.create_user(
            email=email,
            phone=phone,
            password=password,
            full_name=full_name,
            role=User.Role.ADMIN if is_admin else User.Role.CUSTOMER,
            is_staff=is_admin,
            is_email_verified=True,
            is_phone_verified=True,
        )
        profile = Profile.objects.get(user=user)
        profile.address_text = address_text
        if verified and not is_admin:
            profile.verification_status = Profile.VerificationStatus.VERIFIED
            profile.verified_at = timezone.now()
        profile.save()
        return Response({"ok": True, "id": str(user.id)}, status=201)

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
    admin_session_exempt = True

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
