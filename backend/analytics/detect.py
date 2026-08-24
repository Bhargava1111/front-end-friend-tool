import re

from django.core.cache import cache

from catalog.models import Brand, Category


def normalize_query(query: str) -> str:
    cleaned = re.sub(r"\s+", " ", (query or "").strip().lower())
    return cleaned[:255]


def _catalog_terms():
    try:
        cached = cache.get("analytics:catalog-terms")
        if cached is not None:
            return cached
    except Exception:
        cached = None
    categories = list(Category.objects.filter(is_active=True).values_list("name", "slug"))
    brands = list(Brand.objects.filter(is_active=True).values_list("name", "slug"))
    payload = {"categories": categories, "brands": brands}
    try:
        cache.set("analytics:catalog-terms", payload, 600)
    except Exception:
        pass
    return payload


def detect_category_and_brand(query: str) -> tuple[str, str]:
    q = normalize_query(query)
    if not q:
        return "", ""
    terms = _catalog_terms()
    category = ""
    brand = ""
    for name, _slug in terms["categories"]:
        n = (name or "").strip().lower()
        if n and n in q:
            category = name
            break
    for name, _slug in terms["brands"]:
        n = (name or "").strip().lower()
        if n and n in q:
            brand = name
            break
    return category, brand
