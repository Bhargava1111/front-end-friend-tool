from datetime import datetime, time, timedelta

from django.utils import timezone
from django.utils.dateparse import parse_date


def parse_range(params) -> tuple[datetime, datetime, str]:
    """Return (start, end, preset) in the current timezone."""
    tz = timezone.get_current_timezone()
    now = timezone.now()
    today = timezone.localdate()
    preset = (params.get("preset") or params.get("range") or "30d").strip().lower()

    def day_bounds(d):
        start = timezone.make_aware(datetime.combine(d, time.min), tz)
        end = timezone.make_aware(datetime.combine(d, time.max), tz)
        return start, end

    if preset in ("today", "0d"):
        start, _end = day_bounds(today)
        return start, now, "today"
    if preset in ("yesterday", "1d"):
        start, end = day_bounds(today - timedelta(days=1))
        return start, end, "yesterday"
    if preset in ("7d", "last_7", "week"):
        start, _ = day_bounds(today - timedelta(days=6))
        return start, now, "7d"
    if preset in ("custom",) and params.get("from") and params.get("to"):
        start_d = parse_date(str(params.get("from")))
        end_d = parse_date(str(params.get("to")))
        if start_d and end_d:
            start, _ = day_bounds(start_d)
            _s, end = day_bounds(end_d)
            if end > now:
                end = now
            return start, end, "custom"
    start, _ = day_bounds(today - timedelta(days=29))
    return start, now, "30d"


def apply_visitor_filter(qs, params, user_field="user"):
    visitor = (params.get("visitor") or params.get("audience") or "all").strip().lower()
    if visitor in ("guest", "guests"):
        return qs.filter(**{f"{user_field}__isnull": True})
    if visitor in ("logged_in", "logged-in", "user", "users"):
        return qs.filter(**{f"{user_field}__isnull": False})
    user_id = (params.get("user") or params.get("user_id") or "").strip()
    if user_id:
        return qs.filter(**{user_field: user_id})
    return qs


def apply_catalog_filters(qs, params, *, product_field="product", category_field="category"):
    product = (params.get("product") or params.get("product_id") or "").strip()
    if product:
        qs = qs.filter(**{product_field: product})
    category = (params.get("category") or "").strip()
    if category:
        qs = qs.filter(**{f"{category_field}__icontains": category})
    brand = (params.get("brand") or "").strip()
    if brand:
        qs = qs.filter(search__detected_brand__icontains=brand)
    query = (params.get("query") or params.get("q") or "").strip()
    if query:
        qs = qs.filter(search__query_normalized__icontains=query.lower())
    return qs


def page_args(params, default_size=25, max_size=100):
    try:
        page = max(1, int(params.get("page") or 1))
    except (TypeError, ValueError):
        page = 1
    try:
        size = int(params.get("page_size") or default_size)
    except (TypeError, ValueError):
        size = default_size
    size = min(max(1, size), max_size)
    return page, size, (page - 1) * size
