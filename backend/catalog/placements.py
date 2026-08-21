from collections import defaultdict

from catalog.models import HomeOfferSection, Product, ProductOfferPlacement
from catalog.serializers import ProductSerializer


def active_section_defs():
    return list(
        HomeOfferSection.objects.filter(is_active=True).order_by("sort_order", "title")
    )


def active_section_keys():
    return [s.key for s in active_section_defs()]


def section_products(section: str, *, limit: int = 20):
    placements = (
        ProductOfferPlacement.objects.filter(section=section, product__is_active=True)
        .select_related("product", "product__category", "product__brand")
        .prefetch_related("product__images", "product__variants")
        .order_by("sort_order", "-created_at")[:limit]
    )
    products = [p.product for p in placements]
    if not products:
        return []
    return ProductSerializer(products, many=True).data


def all_section_products(*, limit: int = 20) -> dict[str, list]:
    keys = active_section_keys()
    if not keys:
        return {}

    placements = (
        ProductOfferPlacement.objects.filter(section__in=keys, product__is_active=True)
        .select_related("product", "product__category", "product__brand")
        .prefetch_related("product__images", "product__variants")
        .order_by("section", "sort_order", "-created_at")
    )
    grouped: dict[str, list] = defaultdict(list)
    product_ids_seen: dict[str, set] = defaultdict(set)

    for placement in placements:
        bucket = grouped[placement.section]
        if len(bucket) >= limit:
            continue
        pid = placement.product_id
        if pid in product_ids_seen[placement.section]:
            continue
        product_ids_seen[placement.section].add(pid)
        bucket.append(placement.product)

    return {key: ProductSerializer(grouped.get(key, []), many=True).data for key in keys}


def product_section_slugs(product_id) -> list[str]:
    return list(
        ProductOfferPlacement.objects.filter(product_id=product_id)
        .order_by("sort_order")
        .values_list("section", flat=True)
    )


def fallback_products(rule: str, *, limit: int = 20, all_serialized: list | None = None):
    """Return serialized products for a section fallback rule."""
    qs = Product.objects.filter(is_active=True).prefetch_related("images", "variants")
    if rule == "discounted":
        items = []
        for p in qs.filter(mrp__isnull=False).exclude(mrp=0)[:200]:
            if p.mrp and p.mrp > p.price:
                items.append((float((p.mrp - p.price) / p.mrp), p))
        items.sort(key=lambda x: x[0], reverse=True)
        return ProductSerializer([p for _, p in items[:limit]], many=True).data
    if rule == "featured":
        return ProductSerializer(qs.filter(is_featured=True).order_by("-created_at")[:limit], many=True).data
    if rule == "under_99":
        return ProductSerializer(qs.filter(price__lte=99).order_by("price")[:limit], many=True).data
    if rule == "best_seller":
        items = qs.filter(is_best_seller=True).order_by("-created_at")[:limit]
        if not items.exists():
            items = qs.order_by("-created_at")[:limit]
        return ProductSerializer(items, many=True).data
    if rule == "newest":
        return ProductSerializer(qs.order_by("-created_at")[:limit], many=True).data
    if rule == "recommended":
        items = qs.filter(is_recommended=True).order_by("-created_at")[:limit]
        if not items.exists():
            items = qs.order_by("-created_at")[:limit]
        return ProductSerializer(items, many=True).data
    if rule == "combo":
        return ProductSerializer(qs.filter(is_combo=True).order_by("-created_at")[:limit], many=True).data
    return all_serialized[:limit] if all_serialized else []


def resolve_section_products(section_def: HomeOfferSection, sections_map: dict[str, list], all_serialized: list):
    curated = sections_map.get(section_def.key) or []
    if curated:
        return curated[: section_def.max_products]
    if section_def.fallback_rule == "manual":
        return []
    return fallback_products(section_def.fallback_rule, limit=section_def.max_products, all_serialized=all_serialized)


def home_sections_payload(sections_map: dict[str, list], all_serialized: list):
    payload = []
    for s in active_section_defs():
        if not s.show_on_home:
            continue
        products = resolve_section_products(s, sections_map, all_serialized)
        payload.append({
            "id": str(s.id),
            "key": s.key,
            "title": s.title,
            "subtitle": s.subtitle,
            "layout": s.layout,
            "fallback_rule": s.fallback_rule,
            "see_all_tab": s.see_all_tab,
            "max_products": s.max_products,
            "sort_order": s.sort_order,
            "products": products,
        })
    return payload
