"""Default home page sections — used by migrations and admin sync."""

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


def ensure_default_home_sections(HomeOfferSection=None):
    if HomeOfferSection is None:
        from catalog.models import HomeOfferSection as Model
        HomeOfferSection = Model

    created = 0
    for i, (key, title, subtitle, layout, fallback, tab, show_on_home) in enumerate(DEFAULT_HOME_SECTIONS):
        _, was_created = HomeOfferSection.objects.get_or_create(
            key=key,
            defaults={
                "title": title,
                "subtitle": subtitle,
                "layout": layout,
                "fallback_rule": fallback,
                "see_all_tab": tab,
                "sort_order": i + 1,
                "is_active": True,
                "show_on_home": show_on_home,
                "max_products": 12,
                "max_price": 99,
            },
        )
        if was_created:
            created += 1
    apply_canonical_sort_order(HomeOfferSection)
    return created
