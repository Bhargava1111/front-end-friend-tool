from django.core.cache import cache
from django.db.models import Avg, Count, Max, Q
from django.db.models.functions import TruncDate, TruncMonth, TruncWeek
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminRole
from analytics.detect import normalize_query
from analytics.models import JourneyEvent, ProductViewEvent, SearchEvent
from analytics.query import apply_visitor_filter, page_args, parse_range
from analytics.services import get_analytics_cache_version, rate
from catalog.models import Product


CACHE_TTL = 15


def _cache_get(key):
    try:
        return cache.get(key)
    except Exception:
        return None


def _cache_set(key, value, ttl=CACHE_TTL):
    try:
        cache.set(key, value, ttl)
    except Exception:
        pass


def _range_qs(model, request):
    start, end, preset = parse_range(request.query_params)
    qs = model.objects.filter(created_at__gte=start, created_at__lte=end)
    qs = apply_visitor_filter(qs, request.query_params)
    product = (request.query_params.get("product") or "").strip()
    if product and hasattr(model, "product"):
        qs = qs.filter(product_id=product)
    category = (request.query_params.get("category") or "").strip()
    if category:
        if model is SearchEvent:
            qs = qs.filter(detected_category__icontains=category)
        elif model is ProductViewEvent:
            qs = qs.filter(category__icontains=category)
        else:
            qs = qs.filter(Q(product__category__name__icontains=category) | Q(search__detected_category__icontains=category))
    brand = (request.query_params.get("brand") or "").strip()
    if brand:
        if model is SearchEvent:
            qs = qs.filter(detected_brand__icontains=brand)
        else:
            qs = qs.filter(
                Q(product__brand__name__icontains=brand) | Q(search__detected_brand__icontains=brand)
            )
    query = (request.query_params.get("query") or request.query_params.get("q") or "").strip()
    if query:
        nq = normalize_query(query)
        if model is SearchEvent:
            qs = qs.filter(query_normalized__icontains=nq)
        else:
            qs = qs.filter(search__query_normalized__icontains=nq)
    return qs, start, end, preset


class AdminSearchAnalyticsView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        searches, start, end, preset = _range_qs(SearchEvent, request)
        page, size, offset = page_args(request.query_params)

        total = searches.count()
        unique = searches.values("query_normalized").distinct().count()
        today_start, today_end, _ = parse_range({"preset": "today"})
        today_count = SearchEvent.objects.filter(created_at__gte=today_start, created_at__lte=today_end).count()
        zero = searches.filter(results_count=0).count()
        top_row = (
            searches.values("query_normalized")
            .annotate(n=Count("id"), query=Max("query"))
            .order_by("-n")
            .first()
        )
        clicks = JourneyEvent.objects.filter(
            event_type=JourneyEvent.EventType.CLICK,
            created_at__gte=start,
            created_at__lte=end,
            search_id__isnull=False,
        )
        purchases = JourneyEvent.objects.filter(
            event_type=JourneyEvent.EventType.PURCHASE,
            created_at__gte=start,
            created_at__lte=end,
            search_id__isnull=False,
        )
        click_count = clicks.count()
        purchase_count = purchases.count()

        grouped = list(
            searches.values("query_normalized")
            .annotate(
                searches=Count("id"),
                results=Avg("results_count"),
                query=Max("query"),
            )
            .order_by("-searches")[offset : offset + size]
        )
        queries = [g["query_normalized"] for g in grouped]
        click_map = {
            r["search__query_normalized"]: r["n"]
            for r in clicks.filter(search__query_normalized__in=queries)
            .values("search__query_normalized")
            .annotate(n=Count("id"))
        }
        purchase_map = {
            r["search__query_normalized"]: r["n"]
            for r in purchases.filter(search__query_normalized__in=queries)
            .values("search__query_normalized")
            .annotate(n=Count("id"))
        }
        rows = [
            {
                "query": g["query"],
                "query_normalized": g["query_normalized"],
                "searches": g["searches"],
                "results": round(float(g["results"] or 0), 1),
                "product_clicks": click_map.get(g["query_normalized"], 0),
                "purchases": purchase_map.get(g["query_normalized"], 0),
            }
            for g in grouped
        ]
        payload = {
            "preset": preset,
            "from": start.date().isoformat(),
            "to": end.date().isoformat(),
            "kpis": {
                "total_searches": total,
                "unique_searches": unique,
                "today_searches": today_count,
                "zero_result_searches": zero,
                "top_search_query": (top_row or {}).get("query") or "",
                "search_to_click_rate": rate(click_count, total),
                "search_to_purchase_rate": rate(purchase_count, total),
            },
            "rows": rows,
            "page": page,
            "page_size": size,
            "total_rows": searches.values("query_normalized").distinct().count(),
        }
        return Response(payload)


class AdminZeroResultSearchesView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        searches, start, end, preset = _range_qs(SearchEvent, request)
        page, size, offset = page_args(request.query_params)
        qs = (
            searches.filter(results_count=0)
            .values("query_normalized")
            .annotate(searches=Count("id"), query=Max("query"))
            .order_by("-searches")
        )
        total_rows = qs.count()
        rows = [
            {"query": r["query"], "searches": r["searches"]}
            for r in qs[offset : offset + size]
        ]
        return Response(
            {
                "preset": preset,
                "from": start.date().isoformat(),
                "to": end.date().isoformat(),
                "rows": rows,
                "page": page,
                "page_size": size,
                "total_rows": total_rows,
            }
        )


class AdminSearchQueryDetailView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        query = normalize_query(request.query_params.get("query") or "")
        if not query:
            return Response({"detail": "query is required."}, status=400)
        searches, start, end, preset = _range_qs(SearchEvent, request)
        matched = searches.filter(query_normalized=query)
        search_ids = matched.values_list("id", flat=True)
        views = (
            ProductViewEvent.objects.filter(search_id__in=search_ids)
            .values("product_id", "product_name")
            .annotate(views=Count("id"))
            .order_by("-views")[:20]
        )
        return Response(
            {
                "query": matched.aggregate(q=Max("query")).get("q") or query,
                "searches": matched.count(),
                "from": start.date().isoformat(),
                "to": end.date().isoformat(),
                "preset": preset,
                "top_viewed_products": [
                    {
                        "product_id": str(r["product_id"]) if r["product_id"] else None,
                        "product_name": r["product_name"],
                        "views": r["views"],
                    }
                    for r in views
                ],
            }
        )


class AdminProductViewAnalyticsView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        views, start, end, preset = _range_qs(ProductViewEvent, request)
        page, size, offset = page_args(request.query_params)
        grouped = (
            views.values("product_id", "product_name")
            .annotate(views=Count("id"), unique_visitors=Count("session_id", distinct=True))
            .order_by("-views")
        )
        total_rows = grouped.count()
        page_rows = list(grouped[offset : offset + size])
        product_ids = [r["product_id"] for r in page_rows if r["product_id"]]
        carts = {
            r["product_id"]: r["n"]
            for r in JourneyEvent.objects.filter(
                event_type=JourneyEvent.EventType.ADD_TO_CART,
                created_at__gte=start,
                created_at__lte=end,
                product_id__in=product_ids,
            )
            .values("product_id")
            .annotate(n=Count("id"))
        }
        purchases = {
            r["product_id"]: r["n"]
            for r in JourneyEvent.objects.filter(
                event_type=JourneyEvent.EventType.PURCHASE,
                created_at__gte=start,
                created_at__lte=end,
                product_id__in=product_ids,
            )
            .values("product_id")
            .annotate(n=Count("id"))
        }
        rows = [
            {
                "product_id": str(r["product_id"]) if r["product_id"] else None,
                "product": r["product_name"],
                "views": r["views"],
                "unique_visitors": r["unique_visitors"],
                "add_to_cart": carts.get(r["product_id"], 0),
                "purchases": purchases.get(r["product_id"], 0),
            }
            for r in page_rows
        ]
        return Response(
            {
                "preset": preset,
                "from": start.date().isoformat(),
                "to": end.date().isoformat(),
                "rows": rows,
                "page": page,
                "page_size": size,
                "total_rows": total_rows,
            }
        )


class AdminProductViewDetailView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request, pk):
        product = Product.objects.filter(id=pk).select_related("category", "brand").first()
        if not product:
            return Response({"detail": "Not found."}, status=404)
        views, start, end, preset = _range_qs(ProductViewEvent, request)
        views = views.filter(product_id=pk)
        view_count = views.count()
        unique = views.values("session_id").distinct().count()
        carts = JourneyEvent.objects.filter(
            event_type=JourneyEvent.EventType.ADD_TO_CART,
            product_id=pk,
            created_at__gte=start,
            created_at__lte=end,
        ).count()
        purchases = JourneyEvent.objects.filter(
            event_type=JourneyEvent.EventType.PURCHASE,
            product_id=pk,
            created_at__gte=start,
            created_at__lte=end,
        ).count()

        granularity = (request.query_params.get("granularity") or "day").lower()
        trunc = {"week": TruncWeek, "month": TruncMonth}.get(granularity, TruncDate)
        series = (
            views.annotate(bucket=trunc("created_at"))
            .values("bucket")
            .annotate(views=Count("id"))
            .order_by("bucket")
        )
        return Response(
            {
                "product_id": str(product.id),
                "product": product.name,
                "slug": product.slug,
                "category": product.category.name if product.category_id else "",
                "brand": product.brand.name if product.brand_id else "",
                "preset": preset,
                "from": start.date().isoformat(),
                "to": end.date().isoformat(),
                "total_views": view_count,
                "unique_visitors": unique,
                "add_to_cart": carts,
                "purchases": purchases,
                "conversion_rate": rate(purchases, view_count),
                "add_to_cart_rate": rate(carts, view_count),
                "series": [
                    {
                        "period": (
                            r["bucket"].date().isoformat()
                            if hasattr(r["bucket"], "date")
                            else r["bucket"].isoformat()
                        ),
                        "views": r["views"],
                    }
                    for r in series
                    if r["bucket"]
                ],
            }
        )


class AdminCustomerBehaviorView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        start, end, preset = parse_range(request.query_params)
        cache_key = (
            f"analytics:funnel:v{get_analytics_cache_version()}:"
            f"{start.date()}:{end.date()}:{request.query_params.urlencode()}"
        )
        cached = _cache_get(cache_key)
        if cached:
            return Response(cached)

        searches, *_ = _range_qs(SearchEvent, request)
        views, *_ = _range_qs(ProductViewEvent, request)
        journeys, *_ = _range_qs(JourneyEvent, request)
        search_n = searches.count()
        view_n = views.count()
        cart_n = journeys.filter(event_type=JourneyEvent.EventType.ADD_TO_CART).count()
        checkout_n = journeys.filter(event_type=JourneyEvent.EventType.CHECKOUT).count()
        purchase_n = journeys.filter(event_type=JourneyEvent.EventType.PURCHASE).count()
        stages = [
            {"key": "search", "label": "Searches", "count": search_n},
            {"key": "product_view", "label": "Product views", "count": view_n},
            {"key": "add_to_cart", "label": "Add to carts", "count": cart_n},
            {"key": "checkout", "label": "Checkouts", "count": checkout_n},
            {"key": "purchase", "label": "Purchases", "count": purchase_n},
        ]
        conversions = []
        for i in range(1, len(stages)):
            conversions.append(
                {
                    "from": stages[i - 1]["key"],
                    "to": stages[i]["key"],
                    "rate": rate(stages[i]["count"], stages[i - 1]["count"]),
                }
            )
        payload = {
            "preset": preset,
            "from": start.date().isoformat(),
            "to": end.date().isoformat(),
            "stages": stages,
            "conversions": conversions,
            "overall_search_to_purchase": rate(purchase_n, search_n),
            "overall_view_to_purchase": rate(purchase_n, view_n),
        }
        _cache_set(cache_key, payload)
        return Response(payload)


class AdminUserActivityView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        """Anonymized activity feed — no email/phone."""
        page, size, offset = page_args(request.query_params, default_size=40)
        searches, start, end, preset = _range_qs(SearchEvent, request)
        views, *_ = _range_qs(ProductViewEvent, request)
        journeys, *_ = _range_qs(JourneyEvent, request)

        items = []
        for e in searches.only("id", "session_id", "user_id", "query", "created_at")[:200]:
            items.append(
                {
                    "id": str(e.id),
                    "type": "search",
                    "visitor": "logged_in" if e.user_id else "guest",
                    "session": e.session_id[-8:],
                    "label": e.query,
                    "created_at": e.created_at.isoformat(),
                }
            )
        for e in views.only("id", "session_id", "user_id", "product_name", "created_at")[:200]:
            items.append(
                {
                    "id": str(e.id),
                    "type": "product_view",
                    "visitor": "logged_in" if e.user_id else "guest",
                    "session": e.session_id[-8:],
                    "label": e.product_name,
                    "created_at": e.created_at.isoformat(),
                }
            )
        for e in journeys.only("id", "session_id", "user_id", "event_type", "created_at")[:200]:
            items.append(
                {
                    "id": str(e.id),
                    "type": e.event_type,
                    "visitor": "logged_in" if e.user_id else "guest",
                    "session": e.session_id[-8:],
                    "label": e.event_type.replace("_", " "),
                    "created_at": e.created_at.isoformat(),
                }
            )
        items.sort(key=lambda r: r["created_at"], reverse=True)
        total = len(items)
        slice_rows = items[offset : offset + size]
        return Response(
            {
                "preset": preset,
                "from": start.date().isoformat(),
                "to": end.date().isoformat(),
                "rows": slice_rows,
                "page": page,
                "page_size": size,
                "total_rows": total,
            }
        )
