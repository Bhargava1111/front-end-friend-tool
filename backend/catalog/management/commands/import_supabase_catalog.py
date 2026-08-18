from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import AppSetting
from blog.models import BlogPost
from catalog.data.supabase_seed import (
    APP_SETTINGS,
    BANNERS,
    BIMG,
    BLOG_POSTS,
    BRANDS,
    CATEGORIES,
    COUPONS,
    IMG,
    PRODUCT_GALLERY,
    PRODUCTS,
    PRODUCT_VARIANTS,
    SLUG_IMAGE_URLS,
    STORE_LOCATIONS,
)
from catalog.models import Banner, Brand, Category, Product, ProductImage, ProductVariant
from locations.models import StoreLocation
from orders.models import Coupon


class Command(BaseCommand):
    help = "Import full catalog data from Supabase migrations (categories, products, banners, brands, coupons, blog)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing catalog data before importing",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["reset"]:
            self.stdout.write("Clearing existing catalog data...")
            ProductImage.objects.all().delete()
            ProductVariant.objects.all().delete()
            Banner.objects.all().delete()
            Product.objects.all().delete()
            Category.objects.all().delete()
            Brand.objects.all().delete()
            Coupon.objects.all().delete()
            BlogPost.objects.all().delete()
            StoreLocation.objects.all().delete()

        cat_map = {}
        for name, slug, desc, image_key, sort_order in CATEGORIES:
            cat, _ = Category.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "description": desc,
                    "image_url": IMG[image_key],
                    "sort_order": sort_order,
                    "is_active": True,
                },
            )
            cat_map[slug] = cat
        self.stdout.write(f"Categories: {len(cat_map)}")

        brand_map = {}
        for name, slug, tagline, sort_order in BRANDS:
            brand, _ = Brand.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "tagline": tagline,
                    "sort_order": sort_order,
                    "is_active": True,
                    "banner_url": IMG["groceries"],
                },
            )
            brand_map[slug] = brand
        self.stdout.write(f"Brands: {len(brand_map)}")

        coupon_map = {}
        for code, title, desc, dtype, value, min_order, max_discount in COUPONS:
            coupon, _ = Coupon.objects.update_or_create(
                code=code,
                defaults={
                    "title": title,
                    "description": desc,
                    "discount_type": dtype,
                    "discount_value": Decimal(str(value)),
                    "min_order": Decimal(str(min_order)),
                    "max_discount": Decimal(str(max_discount)) if max_discount else None,
                    "banner_url": IMG["groceries"],
                    "is_active": True,
                },
            )
            coupon_map[code] = coupon
        self.stdout.write(f"Coupons: {len(coupon_map)}")

        product_map = {}
        variant_slugs = {row[0] for row in PRODUCT_VARIANTS}
        for row in PRODUCTS:
            (
                cat_slug,
                name,
                slug,
                description,
                weight,
                price,
                mrp,
                stock,
                image_key,
                featured,
                best,
                recommended,
                brand_slug,
            ) = row
            product, _ = Product.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "category": cat_map.get(cat_slug),
                    "brand": brand_map.get(brand_slug) if brand_slug else None,
                    "description": description,
                    "weight": weight,
                    "price": Decimal(str(price)),
                    "mrp": Decimal(str(mrp)),
                    "stock": stock,
                    "image_url": SLUG_IMAGE_URLS.get(slug) or IMG[image_key],
                    "is_featured": featured,
                    "is_best_seller": best,
                    "is_recommended": recommended,
                    "is_active": True,
                    "rating": 4.5 if featured else 4.0,
                    "rating_count": 12 if featured else 5,
                },
            )
            product_map[slug] = product

            if slug not in variant_slugs and not product.variants.exists():
                ProductVariant.objects.create(
                    product=product,
                    label=weight,
                    unit="pack",
                    unit_value=1,
                    price=product.price,
                    mrp=product.mrp,
                    stock=stock,
                    is_default=True,
                    is_active=True,
                    sort_order=0,
                )
        self.stdout.write(f"Products: {len(product_map)}")

        for slug, label, unit, unit_value, price, mrp, stock, is_default in PRODUCT_VARIANTS:
            product = product_map.get(slug)
            if not product:
                continue
            ProductVariant.objects.update_or_create(
                product=product,
                label=label,
                defaults={
                    "unit": unit,
                    "unit_value": Decimal(str(unit_value)),
                    "price": Decimal(str(price)),
                    "mrp": Decimal(str(mrp)),
                    "stock": stock,
                    "is_default": is_default,
                    "is_active": True,
                    "sort_order": 0 if is_default else 1,
                },
            )

        ProductImage.objects.all().delete()
        for slug, urls in PRODUCT_GALLERY.items():
            product = product_map.get(slug)
            if not product:
                continue
            for i, url in enumerate(urls):
                if url == product.image_url:
                    continue
                ProductImage.objects.get_or_create(
                    product=product,
                    image_url=url,
                    defaults={"sort_order": i + 1},
                )
        self.stdout.write(f"Product gallery images: {ProductImage.objects.count()}")

        Banner.objects.all().delete()
        first_coupon = coupon_map.get("FIRST100")
        for title, subtitle, image_key, link_slug, sort_order, placement in BANNERS:
            Banner.objects.create(
                title=title,
                subtitle=subtitle,
                image_url=BIMG.get(image_key, IMG[image_key]),
                link_slug=link_slug,
                sort_order=sort_order,
                placement=placement,
                is_active=True,
                coupon=first_coupon if placement == "coupons" and sort_order == 1 else None,
            )
        self.stdout.write(f"Banners: {Banner.objects.count()}")

        for key, value in APP_SETTINGS.items():
            AppSetting.objects.update_or_create(key=key, defaults={"value": value})
        self.stdout.write(f"App settings: {len(APP_SETTINGS)}")

        now = timezone.now()
        for title, slug, excerpt, body, author, tags, read_minutes, cover in BLOG_POSTS:
            BlogPost.objects.update_or_create(
                slug=slug,
                defaults={
                    "title": title,
                    "excerpt": excerpt,
                    "body": body,
                    "author": author,
                    "tags": tags,
                    "read_minutes": read_minutes,
                    "cover_url": cover,
                    "is_published": True,
                    "published_at": now,
                },
            )
        self.stdout.write(f"Blog posts: {BlogPost.objects.filter(is_published=True).count()}")

        for row in STORE_LOCATIONS:
            name, address, city, state, pincode, lat, lng, phone, hours, radius = row
            StoreLocation.objects.update_or_create(
                name=name,
                defaults={
                    "address_text": address,
                    "city": city,
                    "state": state,
                    "pincode": pincode,
                    "latitude": lat,
                    "longitude": lng,
                    "phone": phone,
                    "opening_hours": hours,
                    "delivery_radius_km": radius,
                    "is_active": True,
                },
            )
        self.stdout.write(f"Store locations: {StoreLocation.objects.count()}")

        self.stdout.write(self.style.SUCCESS("Supabase catalog imported successfully."))
