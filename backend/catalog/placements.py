from catalog.models import ProductOfferPlacement
from catalog.serializers import ProductSerializer


def section_products(section: str, *, limit: int = 20):
    placements = (
        ProductOfferPlacement.objects.filter(section=section, product__is_active=True)
        .select_related("product")
        .order_by("sort_order", "-created_at")[:limit]
    )
    products = [p.product for p in placements]
    if not products:
        return []
    return ProductSerializer(products, many=True).data


def all_section_products(*, limit: int = 20) -> dict[str, list]:
    return {key: section_products(key, limit=limit) for key, _ in ProductOfferPlacement.Section.choices}


def product_section_slugs(product_id) -> list[str]:
    return list(
        ProductOfferPlacement.objects.filter(product_id=product_id)
        .order_by("sort_order")
        .values_list("section", flat=True)
    )
