from django.db.models import Q
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Banner, Brand, Category, Product, Review
from catalog.placements import all_section_products, section_products
from catalog.serializers import (
    BannerSerializer,
    BrandSerializer,
    CategorySerializer,
    CouponSerializer,
    ProductSerializer,
    ReviewSerializer,
)
from orders.models import Coupon


def active_products():
    return Product.objects.filter(is_active=True).prefetch_related("images", "variants")


class HomeView(APIView):
    def get(self, request):
        banners = Banner.objects.filter(is_active=True, placement="home").order_by("sort_order")
        offer_banners = Banner.objects.filter(is_active=True, placement="offers").order_by("sort_order")
        festive_banners = Banner.objects.filter(is_active=True, placement="festive").order_by("sort_order")
        categories = Category.objects.filter(is_active=True, parent__isnull=True).order_by("sort_order")
        products = active_products().order_by("-created_at")
        all_products = ProductSerializer(products[:40], many=True).data
        sections = all_section_products(limit=20)
        return Response({
            "banners": BannerSerializer(banners, many=True).data,
            "offer_banners": BannerSerializer(offer_banners, many=True).data,
            "festive_banners": BannerSerializer(festive_banners, many=True).data,
            "categories": CategorySerializer(categories, many=True).data,
            "featured": sections["todays_deals"] or [p for p in all_products if p.get("is_featured")][:10],
            "best_sellers": [p for p in all_products if p.get("is_best_seller")][:10],
            "recommended": [p for p in all_products if p.get("is_recommended")][:10],
            "bestSelling": [p for p in all_products if p.get("is_best_seller")][:10],
            "newest": all_products[:10],
            "budget": sections["under_99"] or [p for p in all_products if p.get("price", 0) <= 99][:12],
            "all": all_products,
            "sections": sections,
        })


class CategoryListView(APIView):
    def get(self, request):
        qs = Category.objects.filter(is_active=True).order_by("sort_order")
        return Response(CategorySerializer(qs, many=True).data)


class CategoryProductsView(APIView):
    def get(self, request, slug):
        category = Category.objects.filter(slug=slug, is_active=True).select_related("parent").first()
        if not category:
            return Response({"category": None, "products": [], "categories": [], "brands": []})

        children = Category.objects.filter(parent=category, is_active=True).order_by("sort_order")
        if category.parent_id:
            product_category_ids = [category.id]
            rail_categories = Category.objects.filter(
                parent_id=category.parent_id, is_active=True
            ).order_by("sort_order")
        elif children.exists():
            product_category_ids = [category.id, *children.values_list("id", flat=True)]
            rail_categories = children
        else:
            product_category_ids = [category.id]
            rail_categories = Category.objects.filter(id=category.id)

        products = active_products().filter(category_id__in=product_category_ids).order_by("name")
        brands = Brand.objects.filter(is_active=True).order_by("name")
        return Response({
            "category": CategorySerializer(category).data,
            "parent": CategorySerializer(category.parent).data if category.parent_id else None,
            "products": ProductSerializer(products, many=True).data,
            "categories": CategorySerializer(rail_categories, many=True).data,
            "brands": [{"id": b.id, "name": b.name, "slug": b.slug} for b in brands],
        })


class ProductListView(APIView):
    def get(self, request):
        qs = active_products()
        search = request.query_params.get("search")
        category = request.query_params.get("category")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search))
        if category:
            qs = qs.filter(category__slug=category)
        sort = request.query_params.get("sort", "")
        if sort == "price_asc":
            qs = qs.order_by("price")
        elif sort == "price_desc":
            qs = qs.order_by("-price")
        else:
            qs = qs.order_by("-created_at")
        page_size = int(request.query_params.get("page_size", 20))
        page = int(request.query_params.get("page", 1))
        start = (page - 1) * page_size
        items = qs[start : start + page_size]
        return Response({
            "count": qs.count(),
            "results": ProductSerializer(items, many=True).data,
        })


class ProductDetailView(APIView):
    def get(self, request, slug):
        product = active_products().filter(slug=slug).first()
        if not product:
            return Response({"detail": "Not found."}, status=404)
        related = (
            active_products()
            .filter(category=product.category)
            .exclude(id=product.id)
            .prefetch_related("images", "variants")[:6]
        )
        data = ProductSerializer(product).data
        data["related"] = ProductSerializer(related, many=True).data
        return Response(data)


class BannerListView(APIView):
    def get(self, request):
        placement = request.query_params.get("placement", "home")
        qs = Banner.objects.filter(is_active=True, placement=placement).order_by("sort_order")
        return Response(BannerSerializer(qs, many=True).data)


class DealsView(APIView):
    def get(self, request):
        tab = request.query_params.get("tab", "all")
        max_price = request.query_params.get("max_price")

        section_map = {
            "flash": "flash_sale",
            "today": "todays_deals",
            "budget": "under_99",
            "festive": "festive_picks",
            "combo": "combo_packs",
            "custom": "custom_offers",
        }
        if tab in section_map:
            products = section_products(section_map[tab], limit=40)
            if not products:
                products = self._section_fallback(tab, max_price)
            if products:
                return Response({
                    "results": products,
                    "counts": {
                        "discounted": len(products),
                        "budget": len([p for p in products if p.get("price", 0) <= 99]),
                    },
                    "deal_of_the_day": products[0] if products else None,
                })

        if tab in ("best_sellers", "trending", "recommended", "newest"):
            products = self._catalog_tab_fallback(tab)
            return Response({
                "results": products,
                "counts": {"discounted": len(products), "budget": len([p for p in products if p.get("price", 0) <= 99])},
                "deal_of_the_day": products[0] if products else None,
            })

        qs = active_products().filter(mrp__isnull=False).exclude(mrp=0)
        results = []
        for p in qs:
            if p.mrp and p.mrp > p.price:
                discount = round(float((p.mrp - p.price) / p.mrp * 100))
                if tab == "budget" and max_price and float(p.price) > float(max_price):
                    continue
                results.append((discount, p))
        results.sort(key=lambda x: x[0], reverse=True)
        products = ProductSerializer([p for _, p in results], many=True).data
        deal_of_day = products[0] if products else None
        return Response({
            "results": products,
            "counts": {"discounted": len(products), "budget": len([p for p in products if p.get("price", 0) <= 99])},
            "deal_of_the_day": deal_of_day,
        })

    def _section_fallback(self, tab, max_price):
        qs = active_products()
        if tab == "budget":
            if max_price:
                qs = qs.filter(price__lte=float(max_price))
            else:
                qs = qs.filter(price__lte=99)
            return ProductSerializer(qs.order_by("price")[:40], many=True).data
        if tab == "today":
            return ProductSerializer(qs.filter(is_featured=True).order_by("-created_at")[:40], many=True).data
        if tab == "festive":
            return ProductSerializer(qs.order_by("-created_at")[:40], many=True).data
        if tab == "combo":
            return ProductSerializer(qs.filter(is_combo=True).order_by("-created_at")[:40], many=True).data
        # flash / custom — top discounted
        discounted = []
        for p in qs.filter(mrp__isnull=False).exclude(mrp=0):
            if p.mrp and p.mrp > p.price:
                pct = float((p.mrp - p.price) / p.mrp * 100)
                discounted.append((pct, p))
        discounted.sort(key=lambda x: x[0], reverse=True)
        return ProductSerializer([p for _, p in discounted[:40]], many=True).data

    def _catalog_tab_fallback(self, tab):
        qs = active_products()
        if tab == "best_sellers":
            items = qs.filter(is_best_seller=True).order_by("-created_at")[:40]
            if not items.exists():
                items = qs.order_by("-created_at")[:40]
            return ProductSerializer(items, many=True).data
        if tab == "trending":
            items = qs.filter(is_best_seller=True).order_by("-created_at")[:40]
            if not items.exists():
                items = qs.order_by("-created_at")[:40]
            return ProductSerializer(items, many=True).data
        if tab == "recommended":
            items = qs.filter(is_recommended=True).order_by("-created_at")[:40]
            if not items.exists():
                items = qs.order_by("-created_at")[:40]
            return ProductSerializer(items, many=True).data
        if tab == "newest":
            return ProductSerializer(qs.order_by("-created_at")[:40], many=True).data
        return []


class OffersView(APIView):
    def get(self, request):
        banners = Banner.objects.filter(is_active=True, placement="offers").order_by("sort_order")
        festive_banners = Banner.objects.filter(is_active=True, placement="festive").order_by("sort_order")
        categories = Category.objects.filter(is_active=True).order_by("sort_order")[:8]
        festive = section_products("festive_picks", limit=12)
        custom = section_products("custom_offers", limit=12)
        combos = section_products("combo_packs", limit=12)
        combo_products = ProductSerializer(
            active_products().filter(is_combo=True).order_by("-created_at")[:12], many=True
        ).data
        if not combos:
            combos = combo_products
        featured = festive or custom or ProductSerializer(
            active_products().filter(is_featured=True)[:12], many=True
        ).data
        return Response({
            "banners": BannerSerializer(banners, many=True).data,
            "festive_banners": BannerSerializer(festive_banners, many=True).data,
            "categories": CategorySerializer(categories, many=True).data,
            "products": featured,
            "sections": {
                "festive_picks": festive,
                "custom_offers": custom,
                "combo_packs": combos,
            },
        })


class CombosView(APIView):
    def get(self, request):
        qs = active_products().filter(is_combo=True).order_by("-created_at")
        curated = section_products("combo_packs", limit=20)
        if curated:
            return Response(curated)
        return Response(ProductSerializer(qs, many=True).data)


class CouponListView(APIView):
    def get(self, request):
        now = timezone.now()
        qs = Coupon.objects.filter(is_active=True).filter(Q(ends_at__isnull=True) | Q(ends_at__gte=now))
        return Response(CouponSerializer(qs, many=True).data)


class BrandDirectoryView(APIView):
    def get(self, request):
        banners = Banner.objects.filter(is_active=True, placement="brands").order_by("sort_order")
        brands = Brand.objects.filter(is_active=True).order_by("sort_order")
        return Response({
            "banners": BannerSerializer(banners, many=True).data,
            "brands": BrandSerializer(brands, many=True).data,
        })


class ProductReviewsView(APIView):
    def get(self, request, product_id):
        qs = Review.objects.filter(product_id=product_id, is_approved=True).order_by("-created_at")
        return Response(ReviewSerializer(qs, many=True).data)
