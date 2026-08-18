"""Fetch catalog data from a live Supabase project and import into Django."""

from __future__ import annotations

import hashlib
import json
import os
import re
from decimal import Decimal
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from accounts.models import AppSetting
from blog.models import BlogPost
from catalog.models import Banner, Brand, Category, Product, ProductImage, ProductVariant
from locations.models import StoreLocation
from orders.models import Coupon


class SupabaseError(Exception):
    pass


class SupabaseClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key

    def select(self, table: str, select: str = "*", order: str | None = None) -> list[dict]:
        params = [f"select={select}"]
        if order:
            params.append(f"order={order}")
        url = f"{self.base_url}/rest/v1/{table}?{'&'.join(params)}"
        req = Request(
            url,
            headers={
                "apikey": self.api_key,
                "Authorization": f"Bearer {self.api_key}",
                "Accept": "application/json",
            },
        )
        try:
            with urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode())
        except Exception as exc:
            raise SupabaseError(f"Could not read {table} from Supabase: {exc}") from exc
        if not isinstance(data, list):
            raise SupabaseError(f"Unexpected response for {table}")
        return data


def get_supabase_client() -> SupabaseClient:
    url = os.getenv("SUPABASE_URL", "").strip()
    key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        or os.getenv("SUPABASE_ANON_KEY", "").strip()
        or os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip()
    )
    if not url:
        url = "https://xoijdtcwhmyhdgkzcmuh.supabase.co"
    if not key:
        raise SupabaseError(
            "Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in backend/.env to clone live data."
        )
    return SupabaseClient(url, key)


def resolve_image_url(url: str | None, supabase_url: str) -> str:
    if not url:
        return ""
    url = url.strip()
    if url.startswith("http://") or url.startswith("https://"):
        return url
    if url.startswith("/storage/"):
        return urljoin(supabase_url.rstrip("/") + "/", url.lstrip("/"))
    if url.startswith("/images/"):
        filename = Path(url).name
        folder = "products"
        if "banner" in url or filename in {"pooja-essentials.jpg", "festival.jpg"}:
            folder = "banners"
        candidates = [
            f"{supabase_url}/storage/v1/object/public/media/{folder}/{filename}",
            f"{supabase_url}/storage/v1/object/public/media/products/{filename}",
            f"{supabase_url}/storage/v1/object/public/media/{filename}",
        ]
        for candidate in candidates:
            if _url_exists(candidate):
                return candidate
    return url


def _url_exists(url: str) -> bool:
    try:
        req = Request(url, method="HEAD")
        with urlopen(req, timeout=8) as resp:
            return resp.status < 400
    except Exception:
        return False


def mirror_image(url: str, supabase_url: str, media_subdir: str = "catalog") -> str:
    """Download remote image into Django media; return served URL."""
    resolved = resolve_image_url(url, supabase_url)
    if not resolved or not resolved.startswith("http"):
        return resolved

    parsed = urlparse(resolved)
    ext = Path(parsed.path).suffix.lower() or ".jpg"
    if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        ext = ".jpg"
    name = hashlib.sha1(resolved.encode()).hexdigest()[:16] + ext
    dest_dir = Path(settings.MEDIA_ROOT) / media_subdir
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / name
    if not dest.exists():
        req = Request(resolved, headers={"User-Agent": "SriMahalakshmiStores/1.0"})
        with urlopen(req, timeout=20) as resp:
            dest.write_bytes(resp.read())

    media_url = settings.MEDIA_URL.rstrip("/")
    relative = f"{media_url}/{media_subdir}/{name}"
    public_base = os.getenv("PUBLIC_API_URL", "http://localhost:8000").rstrip("/")
    return f"{public_base}{relative}"


def _dec(value) -> Decimal | None:
    if value is None or value == "":
        return None
    return Decimal(str(value))


def _dt(value):
    if not value:
        return None
    if isinstance(value, str):
        return parse_datetime(value.replace("Z", "+00:00"))
    return value


@transaction.atomic
def import_from_supabase(*, reset: bool = False, mirror_images: bool = False) -> dict[str, int]:
    client = get_supabase_client()
    supabase_url = client.base_url
    counts: dict[str, int] = {}

    if reset:
        ProductImage.objects.all().delete()
        ProductVariant.objects.all().delete()
        Banner.objects.all().delete()
        Product.objects.all().delete()
        Category.objects.all().delete()
        Brand.objects.all().delete()
        Coupon.objects.all().delete()
        BlogPost.objects.all().delete()
        StoreLocation.objects.all().delete()

    def img(url: str | None) -> str:
        if not url:
            return ""
        return mirror_image(url, supabase_url) if mirror_images else resolve_image_url(url, supabase_url)

    categories = client.select("categories", order="sort_order.asc")
    for row in categories:
        Category.objects.update_or_create(
            id=row["id"],
            defaults={
                "name": row["name"],
                "slug": row["slug"],
                "description": row.get("description") or "",
                "image_url": img(row.get("image_url")),
                "sort_order": row.get("sort_order") or 0,
                "is_active": row.get("is_active", True),
            },
        )
    counts["categories"] = len(categories)

    brands = client.select("brands", order="sort_order.asc")
    for row in brands:
        Brand.objects.update_or_create(
            id=row["id"],
            defaults={
                "name": row["name"],
                "slug": row["slug"],
                "tagline": row.get("tagline") or "",
                "logo_url": img(row.get("logo_url")),
                "banner_url": img(row.get("banner_url")),
                "sort_order": row.get("sort_order") or 0,
                "is_active": row.get("is_active", True),
            },
        )
    counts["brands"] = len(brands)

    coupons = client.select("coupons", order="code.asc")
    coupon_by_id = {}
    for row in coupons:
        coupon, _ = Coupon.objects.update_or_create(
            id=row["id"],
            defaults={
                "code": row["code"],
                "title": row["title"],
                "description": row.get("description") or "",
                "discount_type": row.get("discount_type") or "percent",
                "discount_value": _dec(row.get("discount_value")) or Decimal("0"),
                "min_order": _dec(row.get("min_order")) or Decimal("0"),
                "max_discount": _dec(row.get("max_discount")),
                "starts_at": _dt(row.get("starts_at")),
                "ends_at": _dt(row.get("ends_at")),
                "usage_limit": row.get("usage_limit"),
                "used_count": row.get("used_count") or 0,
                "banner_url": img(row.get("banner_url")),
                "is_active": row.get("is_active", True),
            },
        )
        coupon_by_id[row["id"]] = coupon
    counts["coupons"] = len(coupons)

    products = client.select("products", order="name.asc")
    product_ids = []
    for row in products:
        product_ids.append(row["id"])
        Product.objects.update_or_create(
            id=row["id"],
            defaults={
                "name": row["name"],
                "slug": row["slug"],
                "category_id": row.get("category_id"),
                "brand_id": row.get("brand_id"),
                "description": row.get("description") or "",
                "weight": row.get("weight") or "",
                "price": _dec(row.get("price")) or Decimal("0"),
                "mrp": _dec(row.get("mrp")),
                "stock": row.get("stock") or 0,
                "image_url": img(row.get("image_url")),
                "video_url": row.get("video_url") or "",
                "benefits": row.get("benefits") or [],
                "shelf_life": row.get("shelf_life") or "",
                "origin": row.get("origin") or "",
                "rating": row.get("rating"),
                "rating_count": row.get("rating_count") or 0,
                "is_featured": row.get("is_featured", False),
                "is_best_seller": row.get("is_best_seller", False),
                "is_recommended": row.get("is_recommended", False),
                "is_active": row.get("is_active", True),
            },
        )
    counts["products"] = len(products)

    if product_ids:
        ProductImage.objects.filter(product_id__in=product_ids).delete()
    gallery = client.select("product_images", order="sort_order.asc")
    for row in gallery:
        if row.get("product_id") not in product_ids:
            continue
        ProductImage.objects.update_or_create(
            id=row["id"],
            defaults={
                "product_id": row["product_id"],
                "image_url": img(row.get("image_url")),
                "sort_order": row.get("sort_order") or 0,
            },
        )
    counts["product_images"] = ProductImage.objects.count()

    variants = client.select("product_variants", order="sort_order.asc")
    for row in variants:
        if row.get("product_id") not in product_ids:
            continue
        ProductVariant.objects.update_or_create(
            id=row["id"],
            defaults={
                "product_id": row["product_id"],
                "label": row["label"],
                "unit": row.get("unit") or "",
                "unit_value": _dec(row.get("unit_value")) or Decimal("1"),
                "price": _dec(row.get("price")) or Decimal("0"),
                "mrp": _dec(row.get("mrp")),
                "stock": row.get("stock") or 0,
                "sku": row.get("sku") or "",
                "image_url": img(row.get("image_url")),
                "is_default": row.get("is_default", False),
                "is_active": row.get("is_active", True),
                "sort_order": row.get("sort_order") or 0,
            },
        )
    counts["product_variants"] = ProductVariant.objects.count()

    banners = client.select("banners", order="sort_order.asc")
    Banner.objects.all().delete()
    for row in banners:
        coupon = coupon_by_id.get(row.get("coupon_id")) if row.get("coupon_id") else None
        brand = Brand.objects.filter(id=row.get("brand_id")).first() if row.get("brand_id") else None
        Banner.objects.create(
            id=row["id"],
            title=row["title"],
            subtitle=row.get("subtitle") or "",
            image_url=img(row.get("image_url")),
            link_slug=row.get("link_slug") or "",
            sort_order=row.get("sort_order") or 0,
            placement=row.get("placement") or "home",
            is_active=row.get("is_active", True),
            coupon=coupon,
            brand=brand,
        )
    counts["banners"] = len(banners)

    settings_rows = client.select("app_settings")
    for row in settings_rows:
        AppSetting.objects.update_or_create(key=row["key"], defaults={"value": row["value"]})
    counts["app_settings"] = len(settings_rows)

    posts = client.select("blog_posts", order="published_at.desc")
    now = timezone.now()
    for row in posts:
        BlogPost.objects.update_or_create(
            id=row["id"],
            defaults={
                "title": row["title"],
                "slug": row["slug"],
                "excerpt": row.get("excerpt") or "",
                "body": row.get("body") or "",
                "author": row.get("author") or "",
                "tags": row.get("tags") or [],
                "read_minutes": row.get("read_minutes") or 5,
                "cover_url": img(row.get("cover_url")),
                "is_published": row.get("is_published", True),
                "published_at": _dt(row.get("published_at")) or now,
            },
        )
    counts["blog_posts"] = BlogPost.objects.count()

    stores = client.select("store_locations", order="name.asc")
    for row in stores:
        StoreLocation.objects.update_or_create(
            id=row["id"],
            defaults={
                "name": row["name"],
                "address_text": row.get("address_text") or "",
                "city": row.get("city") or "",
                "state": row.get("state") or "",
                "pincode": row.get("pincode") or "",
                "latitude": row.get("latitude") or 0,
                "longitude": row.get("longitude") or 0,
                "phone": row.get("phone"),
                "opening_hours": row.get("opening_hours") or "",
                "delivery_radius_km": row.get("delivery_radius_km") or 5,
                "is_active": row.get("is_active", True),
            },
        )
    counts["store_locations"] = len(stores)

    return counts
