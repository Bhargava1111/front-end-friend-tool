from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

from analytics.detect import detect_category_and_brand, normalize_query
from analytics.models import JourneyEvent, ProductViewEvent, SearchEvent


def analytics_session_id(request, body=None) -> str:
    body = body or {}
    raw = (
        (body.get("session_id") or body.get("sessionId") or "")
        or request.headers.get("X-Analytics-Session")
        or request.META.get("HTTP_X_ANALYTICS_SESSION")
        or ""
    )
    return str(raw).strip()[:64]


def resolve_user(request):
    user = getattr(request, "user", None)
    if user and getattr(user, "is_authenticated", False) and not getattr(user, "is_anonymous", True):
        return user
    return None


def invalidate_analytics_cache():
    try:
        cache.delete_many(["analytics:funnel", "analytics:search-kpis", "analytics:catalog-terms"])
    except Exception:
        pass


def record_search(*, request, query, results_count=0, filters=None, session_id=""):
    query = (query or "").strip()[:255]
    if not query or not session_id:
        return None
    normalized = normalize_query(query)
    category, brand = detect_category_and_brand(query)
    incoming = filters if isinstance(filters, dict) else {}
    event = SearchEvent.objects.create(
        user=resolve_user(request),
        session_id=session_id,
        query=query,
        query_normalized=normalized,
        detected_category=incoming.get("category") or category,
        detected_brand=incoming.get("brand") or brand,
        filters=incoming,
        results_count=int(results_count or 0),
    )
    invalidate_analytics_cache()
    return event


def record_product_view(*, request, product, session_id="", search_id=None, source="", referrer=""):
    if not product or not session_id:
        return None, False
    window = int(getattr(settings, "ANALYTICS_VIEW_DEDUP_SECONDS", 1800))
    cutoff = timezone.now() - timedelta(seconds=max(60, window))
    existing = (
        ProductViewEvent.objects.filter(session_id=session_id, product=product, created_at__gte=cutoff)
        .order_by("-created_at")
        .first()
    )
    if existing:
        return existing, False

    search = None
    if search_id:
        search = SearchEvent.objects.filter(id=search_id).first()

    category_name = ""
    if getattr(product, "category_id", None) and getattr(product, "category", None):
        category_name = product.category.name

    event = ProductViewEvent.objects.create(
        user=resolve_user(request),
        session_id=session_id,
        product=product,
        product_name=product.name,
        category=category_name,
        search=search,
        source=(source or "")[:80],
        referrer=(referrer or "")[:255],
    )
    invalidate_analytics_cache()
    return event, True


def record_journey(
    *,
    request,
    event_type,
    session_id="",
    search_id=None,
    product=None,
    order=None,
    metadata=None,
):
    if not session_id or event_type not in JourneyEvent.EventType.values:
        return None
    search = SearchEvent.objects.filter(id=search_id).first() if search_id else None
    event = JourneyEvent.objects.create(
        user=resolve_user(request),
        session_id=session_id,
        event_type=event_type,
        search=search,
        product=product,
        order=order,
        metadata=metadata or {},
    )
    invalidate_analytics_cache()
    return event


def record_purchase(*, request, order, session_id="", search_id=None):
    if not order:
        return
    sid = session_id or analytics_session_id(request)
    if not sid:
        sid = f"user:{order.user_id}"
    items = list(order.order_items.select_related("product").all())
    last_search = None
    if search_id:
        last_search = SearchEvent.objects.filter(id=search_id).first()
    if not last_search:
        last_search = SearchEvent.objects.filter(session_id=sid).order_by("-created_at").first()
    for item in items:
        record_journey(
            request=request,
            event_type=JourneyEvent.EventType.PURCHASE,
            session_id=sid,
            search_id=last_search.id if last_search else None,
            product=item.product,
            order=order,
            metadata={"quantity": item.quantity, "product_name": item.product_name},
        )


def rate(numerator: int, denominator: int) -> float:
    if not denominator:
        return 0.0
    return round((numerator / denominator) * 100, 2)
