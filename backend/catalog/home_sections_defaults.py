"""Default home page sections — used by migrations and admin sync."""

from django.db import models

DEFAULT_HOME_SECTIONS = [
    ("categories", "Shop by category", "", "categories", "manual", "", True),
    ("festive_picks", "Festive picks", "Pooja kits, lamps and seasonal specials", "rail", "manual", "festive", True),
    ("newest", "Newly added", "", "rail", "newest", "newest", True),
    ("flash_sale", "Flash Sale", "Ends at midnight — grab them before they're gone", "countdown_rail", "discounted", "flash", True),
    ("todays_deals", "Today's deals", "", "rail", "featured", "today", True),
    ("deal_of_the_day", "Deal of the day", "One hero pick — limited time", "deal_card", "discounted", "today", True),
    ("under_99", "Under ₹99 store", "Small basket, big savings", "budget_rail", "under_99", "budget", True),
    ("combo_packs", "Combo packs", "", "rail", "combo", "combo", True),
    ("trending", "Trending now", "", "rail", "best_seller", "trending", True),
    ("best_sellers", "Best sellers", "", "rail", "best_seller", "best_sellers", True),
    ("offers_strip", "Today's offers", "Deals & combos", "offers_strip", "manual", "", True),
    ("coupon_strip", "Coupons for you", "", "coupon_strip", "manual", "", True),
    ("festive_banners", "Festival picks", "Pooja kits, lamps and seasonal specials", "festive_banners", "manual", "festive", True),
    ("shop_by_need", "Shop by need", "", "shop_by_need", "manual", "", True),
    ("recommended", "Recommended for you", "", "rail", "recommended", "recommended", True),
    ("brands", "Featured brands", "", "brands", "manual", "", True),
    ("recently_viewed", "Recently viewed", "", "recently_viewed", "manual", "", True),
    ("service_promises", "Why shop with us", "", "service_promises", "manual", "", True),
    ("custom_offers", "Custom offers", "", "rail", "manual", "today", False),
]


def canonical_section_order(HomeOfferSection=None):
    if HomeOfferSection is None:
        from catalog.models import HomeOfferSection as Model
        HomeOfferSection = Model

    canonical_keys = [row[0] for row in DEFAULT_HOME_SECTIONS]
    all_sections = list(HomeOfferSection.objects.all())
    by_key = {s.key: s for s in all_sections}
    ordered = []
    seen = set()
    for key in canonical_keys:
        if key in by_key:
            ordered.append(by_key[key])
            seen.add(key)
    custom = sorted(
        [s for s in all_sections if s.key not in seen],
        key=lambda s: (s.sort_order, s.title),
    )
    return ordered + custom


def apply_canonical_sort_order(HomeOfferSection=None):
    sections = canonical_section_order(HomeOfferSection)
    for i, section in enumerate(sections):
        section.sort_order = i
    if sections:
        HomeOfferSection.objects.bulk_update(sections, ["sort_order"])
    return len(sections)


def normalize_section_max_prices(HomeOfferSection=None):
    """Clear max_price on sections that are not budget / under-₹99 rails."""
    if HomeOfferSection is None:
        from catalog.models import HomeOfferSection as Model
        HomeOfferSection = Model

    layout_enum = getattr(HomeOfferSection, "Layout", None)
    rule_enum = getattr(HomeOfferSection, "FallbackRule", None)
    budget_layout = layout_enum.BUDGET_RAIL if layout_enum else "budget_rail"
    under_99_rule = rule_enum.UNDER_99 if rule_enum else "under_99"

    field = HomeOfferSection._meta.get_field("max_price")
    if field.null:
        HomeOfferSection.objects.exclude(layout=budget_layout).exclude(
            fallback_rule=under_99_rule
        ).update(max_price=None)
    HomeOfferSection.objects.filter(
        models.Q(layout=budget_layout) | models.Q(fallback_rule=under_99_rule)
    ).update(max_price=99)
    return HomeOfferSection.objects.filter(
        models.Q(layout=budget_layout) | models.Q(fallback_rule=under_99_rule)
    ).count()


def ensure_default_home_sections(HomeOfferSection=None):
    if HomeOfferSection is None:
        from catalog.models import HomeOfferSection as Model
        HomeOfferSection = Model

    created = 0
    for i, (key, title, subtitle, layout, fallback, tab, show_on_home) in enumerate(DEFAULT_HOME_SECTIONS):
        defaults = {
            "title": title,
            "subtitle": subtitle,
            "layout": layout,
            "fallback_rule": fallback,
            "see_all_tab": tab,
            "sort_order": i + 1,
            "is_active": True,
            "show_on_home": show_on_home,
            "max_products": 12,
        }
        if layout == "budget_rail" or fallback == "under_99":
            defaults["max_price"] = 99
        _, was_created = HomeOfferSection.objects.get_or_create(
            key=key,
            defaults=defaults,
        )
        if was_created:
            created += 1
    normalize_section_max_prices(HomeOfferSection)
    apply_canonical_sort_order(HomeOfferSection)
    return created
