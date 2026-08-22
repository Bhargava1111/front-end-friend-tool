from collections import defaultdict
from decimal import Decimal

from catalog.models import HomeOfferSection, Product, ProductOfferPlacement
from catalog.serializers import ProductSerializer


def active_section_defs(*, include_hidden=False):
    qs = HomeOfferSection.objects.filter(is_active=True)
    if not include_hidden:
        qs = qs.filter(show_on_home=True)
    return list(qs.order_by("sort_order", "title"))


def all_active_section_defs():
    return list(HomeOfferSection.objects.filter(is_active=True).order_by("sort_order", "title"))


def active_section_keys():
    return [s.key for s in active_section_defs()]


def _product_price(p: Product) -> Decimal:
    return Decimal(str(p.price or 0))


def _filter_by_max_price(products: list[Product], max_price: int | None) -> list[Product]:
    if not max_price:
        return products
    ceiling = Decimal(str(max_price))
    return [p for p in products if _product_price(p) <= ceiling]


def _section_applies_max_price(section_def: HomeOfferSection | None) -> bool:
    if not section_def:
        return False
    return (
        section_def.layout == HomeOfferSection.Layout.BUDGET_RAIL
        or section_def.fallback_rule == HomeOfferSection.FallbackRule.UNDER_99
    )


def section_products(section: str, *, limit: int = 20, max_price: int | None = None):
    placements = (
        ProductOfferPlacement.objects.filter(section=section, product__is_active=True)
        .select_related("product", "product__category", "product__brand")
        .prefetch_related("product__images", "product__variants")
        .order_by("sort_order", "-created_at")[: limit * 2]
    )
    products = _filter_by_max_price([p.product for p in placements], max_price)[:limit]
    if not products:
        return []
    return ProductSerializer(products, many=True).data


def all_section_products(*, limit: int = 20) -> dict[str, list]:
    section_defs = {s.key: s for s in all_active_section_defs()}
    keys = list(section_defs.keys())
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
        section_def = section_defs.get(placement.section)
        bucket = grouped[placement.section]
        if len(bucket) >= limit:
            continue
        pid = placement.product_id
        if pid in product_ids_seen[placement.section]:
            continue
        product = placement.product
        if (
            _section_applies_max_price(section_def)
            and section_def.max_price
            and _product_price(product) > Decimal(str(section_def.max_price))
        ):
            continue
        product_ids_seen[placement.section].add(pid)
        bucket.append(product)

    return {key: ProductSerializer(grouped.get(key, []), many=True).data for key in keys}


def product_section_slugs(product_id) -> list[str]:
    return list(
        ProductOfferPlacement.objects.filter(product_id=product_id)
        .order_by("sort_order")
        .values_list("section", flat=True)
    )


def fallback_products(
    rule: str,
    *,
    limit: int = 20,
    max_price: int | None = None,
    all_serialized: list | None = None,
):
    """Return serialized products for a section fallback rule."""
    qs = Product.objects.filter(is_active=True).prefetch_related("images", "variants")
    if rule == "discounted":
        items = []
        for p in qs.filter(mrp__isnull=False).exclude(mrp=0)[:200]:
            if p.mrp and p.mrp > p.price:
                items.append((float((p.mrp - p.price) / p.mrp), p))
        items.sort(key=lambda x: x[0], reverse=True)
        products = [p for _, p in items[:limit]]
        return ProductSerializer(_filter_by_max_price(products, max_price), many=True).data
    if rule == "featured":
        products = list(qs.filter(is_featured=True).order_by("-created_at")[:limit])
        return ProductSerializer(_filter_by_max_price(products, max_price), many=True).data
    if rule == "under_99":
        ceiling = max_price if max_price is not None else 99
        products = list(qs.filter(price__lte=ceiling).order_by("price")[:limit])
        return ProductSerializer(products, many=True).data
    if rule == "best_seller":
        items = qs.filter(is_best_seller=True).order_by("-created_at")[:limit]
        if not items.exists():
            items = qs.order_by("-created_at")[:limit]
        return ProductSerializer(_filter_by_max_price(list(items), max_price), many=True).data
    if rule == "newest":
        products = list(qs.order_by("-created_at")[:limit])
        return ProductSerializer(_filter_by_max_price(products, max_price), many=True).data
    if rule == "recommended":
        items = qs.filter(is_recommended=True).order_by("-created_at")[:limit]
        if not items.exists():
            items = qs.order_by("-created_at")[:limit]
        return ProductSerializer(_filter_by_max_price(list(items), max_price), many=True).data
    if rule == "combo":
        products = list(qs.filter(is_combo=True).order_by("-created_at")[:limit])
        return ProductSerializer(_filter_by_max_price(products, max_price), many=True).data
    pool = all_serialized[:limit] if all_serialized else []
    if max_price:
        pool = [p for p in pool if float(p.get("price", 0)) <= max_price]
    return pool


def resolve_section_products(section_def: HomeOfferSection, sections_map: dict[str, list], all_serialized: list):
    curated_raw = sections_map.get(section_def.key) or []
    max_price = section_def.max_price if _section_applies_max_price(section_def) else None

    if curated_raw:
        if max_price:
            curated_raw = [p for p in curated_raw if float(p.get("price", 0)) <= max_price]
        if curated_raw:
            return curated_raw[: section_def.max_products]

    if section_def.fallback_rule == HomeOfferSection.FallbackRule.MANUAL:
        return []

    return fallback_products(
        section_def.fallback_rule,
        limit=section_def.max_products,
        max_price=max_price,
        all_serialized=all_serialized,
    )


def resolve_section_product_ids(section_def: HomeOfferSection, sections_map: dict[str, list] | None = None, all_serialized: list | None = None) -> list[str]:
    if sections_map is None:
        sections_map = all_section_products(limit=section_def.max_products)
    if all_serialized is None:
        all_serialized = []
    products = resolve_section_products(section_def, sections_map, all_serialized)
    return [str(p["id"]) for p in products if p.get("id")]


def section_meta_list(sections_map: dict[str, list] | None = None, all_serialized: list | None = None):
    if sections_map is None:
        sections_map = all_section_products(limit=40)
    meta = []
    for s in all_active_section_defs():
        resolved_ids = resolve_section_product_ids(s, sections_map, all_serialized or [])
        placed_count = ProductOfferPlacement.objects.filter(section=s.key).count()
        meta.append({
            "id": str(s.id),
            "key": s.key,
            "title": s.title,
            "subtitle": s.subtitle,
            "layout": s.layout,
            "fallback_rule": s.fallback_rule,
            "see_all_tab": s.see_all_tab,
            "max_price": s.max_price,
            "max_products": s.max_products,
            "sort_order": s.sort_order,
            "show_on_home": s.show_on_home,
            "placed_count": placed_count,
            "display_count": len(resolved_ids),
            "resolved_product_ids": resolved_ids,
        })
    return meta


def home_sections_payload(sections_map: dict[str, list], all_serialized: list):
    payload = []
    for s in active_section_defs():
        products = resolve_section_products(s, sections_map, all_serialized)
        payload.append({
            "id": str(s.id),
            "key": s.key,
            "title": s.title,
            "subtitle": s.subtitle,
            "layout": s.layout,
            "fallback_rule": s.fallback_rule,
            "see_all_tab": s.see_all_tab,
            "max_price": s.max_price,
            "max_products": s.max_products,
            "sort_order": s.sort_order,
            "products": products,
        })
    return payload
