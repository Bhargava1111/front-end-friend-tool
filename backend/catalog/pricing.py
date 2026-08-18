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


def unit_price_for_qty(product, variant, quantity: int) -> Decimal:
    """Pick tier unit price for quantity, else variant/product base price."""
    base = variant.price if variant is not None else product.price
    tiers = normalize_price_tiers(getattr(product, "price_tiers", None) or [])
    qty = max(1, int(quantity or 1))
    for tier in tiers:
        if tier["min_qty"] <= qty <= tier["max_qty"]:
            return Decimal(str(tier["unit_price"]))
    return Decimal(str(base))
