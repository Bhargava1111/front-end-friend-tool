"""Default home page sections — used by migrations and admin sync."""

DEFAULT_HOME_SECTIONS = [
    ("flash_sale", "Flash Sale", "Ends at midnight — grab them before they're gone", "countdown_rail", "discounted", "flash", True),
    ("todays_deals", "Today's deals", "", "rail", "featured", "today", True),
    ("deal_of_the_day", "Deal of the day", "One hero pick — limited time", "deal_card", "discounted", "today", True),
    ("under_99", "Under ₹99 store", "Small basket, big savings", "budget_rail", "under_99", "budget", True),
    ("festive_picks", "Festive picks", "Pooja kits, lamps and seasonal specials", "rail", "manual", "festive", True),
    ("combo_packs", "Combo packs", "", "rail", "combo", "combo", True),
    ("trending", "Trending now", "", "rail", "best_seller", "trending", True),
    ("best_sellers", "Best sellers", "", "rail", "best_seller", "best_sellers", True),
    ("recommended", "Recommended for you", "", "rail", "recommended", "recommended", True),
    ("newest", "Newly added", "", "rail", "newest", "newest", True),
    ("custom_offers", "Custom offers", "", "rail", "manual", "today", False),
]


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
    return created
