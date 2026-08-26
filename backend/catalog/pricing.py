"""Resolve unit price from product price tiers (qty breaks)."""

from __future__ import annotations

from decimal import Decimal


def normalize_price_tiers(raw) -> list[dict]:
    tiers = []
    if not isinstance(raw, list):
        return tiers
    for item in raw:
        if not isinstance(item, dict):
            continue
        try:
            min_qty = int(item.get("min_qty") or item.get("minQty") or 1)
            max_qty = int(item.get("max_qty") or item.get("maxQty") or 999)
            unit_price = Decimal(str(item.get("unit_price") or item.get("unitPrice") or 0))
        except (TypeError, ValueError):
            continue
        if min_qty < 1 or max_qty < min_qty or unit_price <= 0:
            continue
        tiers.append(
            {
                "min_qty": min_qty,
                "max_qty": max_qty,
                "unit_price": float(unit_price),
            }
        )
    tiers.sort(key=lambda t: (t["min_qty"], t["max_qty"]))
    return tiers


def reference_tier_unit_price(tiers: list[dict], fallback: float) -> float:
    if not tiers:
        return fallback
    for tier in tiers:
        if tier["min_qty"] <= 1 <= tier["max_qty"]:
            return float(tier["unit_price"])
    return float(tiers[0]["unit_price"])


def scale_price_tiers(tiers: list[dict], variant_price: float, reference_price: float) -> list[dict]:
    if not tiers or reference_price <= 0:
        return tiers
    ratio = variant_price / reference_price
    if abs(ratio - 1) < 0.0001:
        return tiers
    scaled = []
    for tier in tiers:
        scaled.append(
            {
                **tier,
                "unit_price": round(float(tier["unit_price"]) * ratio, 2),
            }
        )
    return scaled


def _default_variant_price(product, fallback) -> float:
    variants = getattr(product, "variants", None)
    if variants is None or not hasattr(variants, "filter"):
        return float(fallback)
    default = variants.filter(is_default=True, is_active=True).first()
    if default is not None:
        return float(default.price)
    first = variants.filter(is_active=True).order_by("sort_order", "price").first()
    if first is not None:
        return float(first.price)
    return float(fallback)


def unit_price_for_qty(product, variant, quantity: int) -> Decimal:
    """Pick tier unit price for quantity, else variant/product base price."""
    base = variant.price if variant is not None else product.price
    variant_tiers = normalize_price_tiers(getattr(variant, "price_tiers", None) or []) if variant else []
    product_tiers = normalize_price_tiers(getattr(product, "price_tiers", None) or [])
    tiers = variant_tiers or product_tiers
    if variant is not None and tiers and not variant_tiers:
        reference = reference_tier_unit_price(tiers, _default_variant_price(product, product.price))
        tiers = scale_price_tiers(tiers, float(base), reference)
    qty = max(1, int(quantity or 1))
    for tier in tiers:
        if tier["min_qty"] <= qty <= tier["max_qty"]:
            return Decimal(str(tier["unit_price"]))
    return Decimal(str(base))
