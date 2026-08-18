"""Catalog seed data extracted from Supabase SQL migrations."""


def u(photo_id: str, w: int = 800) -> str:
    return f"https://images.unsplash.com/photo-{photo_id}?w={w}&q=80"


# Product & category images from Supabase migrations (working Unsplash URLs).
IMG = {
    "pooja": u("1602928321679-560bb453f190"),
    "rice": u("1586201375761-83865001e31c"),
    "dal": u("1596040033229-a9821ebd058d"),
    "oil": u("1474979266404-7eaacbcd87c5"),
    "ghee": u("1590779033100-9f60a05a013d"),
    "agarbatti": u("1602928321679-560bb453f190"),
    "camphor": u("1600189261867-30e5ffe7b8da"),
    "brass": u("1602928321679-560bb453f190"),
    "basmati": u("1536304993881-ff6e9eefa2a6"),
    "millet": u("1574323347407-f5e1ad6d020b"),
    "moong": u("1515543237350-b3eea1ec8082"),
    "chana": u("1515543237350-b3eea1ec8082"),
    "coconut": u("1590779033100-9f60a05a013d"),
    "turmeric": u("1615485500704-8e990f9900f7"),
    "almonds": u("1508747703725-719777637510"),
    "cashew": u("1599599810769-bcde5a160d32"),
    "raisins": u("1596591606975-97ee5cef3a1e"),
    "mysore": u("1606491956689-2ea866880c84"),
    "pakoda": u("1601050690597-df0568f70950"),
    "marigold": u("1519378058457-4c29a0a2efac"),
    "lotus": u("1470137430626-983a37b8ea46"),
    "groceries": u("1586201375761-83865001e31c"),
    "festival": u("1606491956689-2ea866880c84"),
}

# Exact per-product image URLs from the original Supabase seed SQL.
SLUG_IMAGE_URLS = {
    "pure-cow-ghee-diya-oil": u("1590779033100-9f60a05a013d"),
    "sandalwood-agarbatti": u("1602928321679-560bb453f190"),
    "camphor-tablets": u("1600189261867-30e5ffe7b8da"),
    "brass-puja-thali-set": u("1602928321679-560bb453f190"),
    "cotton-wicks": u("1602928321679-560bb453f190"),
    "sona-masoori-rice": u("1586201375761-83865001e31c"),
    "basmati-rice-premium": u("1536304993881-ff6e9eefa2a6"),
    "foxtail-millet": u("1574323347407-f5e1ad6d020b"),
    "toor-dal": u("1596040033229-a9821ebd058d"),
    "moong-dal": u("1515543237350-b3eea1ec8082"),
    "chana-dal": u("1515543237350-b3eea1ec8082"),
    "wood-pressed-groundnut-oil": u("1474979266404-7eaacbcd87c5"),
    "a2-desi-cow-ghee": u("1590779033100-9f60a05a013d"),
    "cold-pressed-coconut-oil": u("1590779033100-9f60a05a013d"),
    "turmeric-powder": u("1615485500704-8e990f9900f7"),
    "kumkum-powder": u("1602928321679-560bb453f190"),
    "sambar-masala": u("1596040033229-a9821ebd058d"),
    "premium-almonds": u("1508747703725-719777637510"),
    "cashew-nuts-w240": u("1599599810769-bcde5a160d32"),
    "seedless-raisins": u("1596591606975-97ee5cef3a1e"),
    "mysore-pak": u("1606491956689-2ea866880c84"),
    "ribbon-pakoda": u("1601050690597-df0568f70950"),
    "marigold-garland": u("1519378058457-4c29a0a2efac"),
    "lotus-flowers": u("1470137430626-983a37b8ea46"),
}

# Extra gallery images (product_images table) keyed by product slug.
PRODUCT_GALLERY = {
    "brass-puja-thali-set": [u("1602928321679-560bb453f190"), u("1600189261867-30e5ffe7b8da")],
    "a2-desi-cow-ghee": [u("1590779033100-9f60a05a013d")],
    "sona-masoori-rice": [u("1586201375761-83865001e31c"), u("1536304993881-ff6e9eefa2a6")],
    "marigold-garland": [u("1519378058457-4c29a0a2efac")],
    "cashew-nuts-w240": [u("1599599810769-bcde5a160d32")],
    "chana-dal": [u("1515543237350-b3eea1ec8082")],
}

# Wide banner images (1200×400)
BIMG = {
    "pooja": u("1602928321679-560bb453f190", 1200),
    "rice": u("1586201375761-83865001e31c", 1200),
    "oil": u("1474979266404-7eaacbcd87c5", 1200),
    "festival": u("1606491956689-2ea866880c84", 1200),
    "groceries": u("1586201375761-83865001e31c", 1200),
}

CATEGORIES = [
    ("Pooja Essentials", "pooja-essentials", "Everything for your daily rituals", "pooja", 1),
    ("Rice & Grains", "rice-grains", "Premium rice, millets and grains", "rice", 2),
    ("Dals & Pulses", "dals-pulses", "Everyday dals and pulses", "dal", 3),
    ("Oils & Ghee", "oils-ghee", "Cold pressed oils and pure ghee", "oil", 4),
    ("Spices & Masala", "spices-masala", "Freshly ground spices", "dal", 5),
    ("Dry Fruits", "dry-fruits", "Premium nuts and dry fruits", "almonds", 6),
    ("Snacks & Sweets", "snacks-sweets", "Traditional snacks and sweets", "mysore", 7),
    ("Puja Flowers & Garlands", "puja-flowers", "Fresh flowers and garlands", "marigold", 8),
]

# (title, subtitle, image_key, link_slug, sort_order, placement)
BANNERS = [
    ("Festive Pooja Store", "Up to 30% off on all pooja essentials", "pooja", "pooja-essentials", 1, "home"),
    ("Fresh From The Farm", "Premium rice & grains delivered daily", "rice", "rice-grains", 2, "home"),
    ("Pure Cold-Pressed Oils", "Traditional wood-pressed goodness", "oil", "oils-ghee", 3, "home"),
    ("Festival Specials", "Up to 20% off pooja combos", "festival", "pooja-essentials", 4, "home"),
    ("Weekend Mega Sale", "Extra savings on staples & oils", "groceries", "rice-grains", 1, "offers"),
    ("Pooja Combo Offers", "Bundle and save on daily rituals", "pooja", "pooja-essentials", 2, "offers"),
    ("Save with coupon codes", "Copy a code and apply at checkout", "festival", "", 1, "coupons"),
    ("Shop by brand", "Trusted names for your kitchen", "groceries", "", 1, "brands"),
    ("Pooja Combo Pack", "Everything for your daily puja", "pooja", "pooja-essentials", 1, "combos"),
]

BRANDS = [
    ("Aashirvaad", "aashirvaad", "Atta & staples", 1),
    ("Cycle Pure", "cycle-pure", "Agarbatti & dhoop", 2),
    ("Nandini", "nandini", "Dairy & ghee", 3),
    ("24 Mantra", "24-mantra", "Certified organic", 4),
    ("Tata Sampann", "tata-sampann", "Dals & spices", 5),
    ("Saffola", "saffola", "Cooking oils", 6),
]

COUPONS = [
    ("FIRST100", "₹100 off your first order", "Flat ₹100 off on orders above ₹399", "flat", 100, 399, None),
    ("POOJA15", "15% off pooja essentials", "Save 15% up to ₹150", "percent", 15, 299, 150),
    ("FREESHIP", "Free delivery", "No delivery fee on orders above ₹249", "free_shipping", 0, 249, None),
]

APP_SETTINGS = {
    "delivery_fee": 40,
    "free_delivery_above": 499,
    "tax_rate": 5,
    "maintenance_mode": False,
    "support_phone": "+91 98400 12345",
    "support_email": "care@srimahalakshmistores.in",
}

STORE_LOCATIONS = [
    ("Sri Mahalakshmi Stores — T. Nagar", "12, Ranganathan Street, T. Nagar", "Chennai", "Tamil Nadu", "600017", 13.0418, 80.2341, "+91 98400 11223", "7:00 AM - 10:00 PM", 6),
    ("Sri Mahalakshmi Stores — Adyar", "45, Sardar Patel Road, Adyar", "Chennai", "Tamil Nadu", "600020", 13.0067, 80.2570, "+91 98400 11224", "7:00 AM - 10:00 PM", 5),
    ("Sri Mahalakshmi Stores — Anna Nagar", "8, 2nd Avenue, Anna Nagar", "Chennai", "Tamil Nadu", "600040", 13.0850, 80.2101, "+91 98400 11225", "6:30 AM - 10:30 PM", 7),
    ("Sri Mahalakshmi Stores — Velachery", "101, Velachery Main Road", "Chennai", "Tamil Nadu", "600042", 12.9791, 80.2210, "+91 98400 11226", "7:00 AM - 9:30 PM", 5),
    ("Sri Mahalakshmi Stores — Mylapore", "23, North Mada Street, Mylapore", "Chennai", "Tamil Nadu", "600004", 13.0339, 80.2695, "+91 98400 11227", "6:00 AM - 10:00 PM", 4),
]

# (cat_slug, name, slug, description, weight, price, mrp, stock, image_key, featured, best, recommended, brand_slug)
PRODUCTS = [
    ("pooja-essentials", "Pure Cow Ghee Diya Oil", "pure-cow-ghee-diya-oil", "Ready-to-use cow ghee for lamps, made from A2 milk.", "500 ml", 349, 449, 40, "ghee", True, True, True, "nandini"),
    ("pooja-essentials", "Sandalwood Agarbatti Pack", "sandalwood-agarbatti", "Hand-rolled sandalwood incense sticks, long lasting fragrance.", "100 g", 99, 149, 120, "agarbatti", True, False, True, "cycle-pure"),
    ("pooja-essentials", "Camphor Tablets (Kapur)", "camphor-tablets", "Pure white camphor tablets for aarti and havan.", "100 g", 129, 159, 80, "camphor", False, True, False, "cycle-pure"),
    ("pooja-essentials", "Brass Puja Thali Set", "brass-puja-thali-set", "Handcrafted brass thali with bell, diya and kumkum holder.", "1 set", 899, 1299, 15, "brass", True, False, True, None),
    ("pooja-essentials", "Cotton Wicks (Batti)", "cotton-wicks", "Soft long cotton wicks for diyas, pack of 500.", "Pack of 500", 59, 79, 200, "pooja", False, False, True, "cycle-pure"),
    ("rice-grains", "Sona Masoori Rice", "sona-masoori-rice", "Premium aged Sona Masoori rice, light and aromatic.", "5 kg", 449, 549, 60, "rice", True, True, False, "aashirvaad"),
    ("rice-grains", "Basmati Rice Premium", "basmati-rice-premium", "Extra long grain aged basmati rice.", "1 kg", 199, 249, 90, "basmati", False, True, True, "aashirvaad"),
    ("rice-grains", "Foxtail Millet", "foxtail-millet", "Nutritious unpolished foxtail millet.", "1 kg", 129, 169, 45, "millet", False, False, True, "24-mantra"),
    ("dals-pulses", "Toor Dal (Arhar)", "toor-dal", "Unpolished toor dal, rich in protein.", "1 kg", 169, 199, 70, "dal", True, True, False, "tata-sampann"),
    ("dals-pulses", "Moong Dal", "moong-dal", "Split yellow moong dal, easy to cook.", "1 kg", 149, 179, 65, "moong", False, False, True, "tata-sampann"),
    ("dals-pulses", "Chana Dal", "chana-dal", "Premium quality bengal gram split.", "1 kg", 119, 149, 80, "chana", False, False, False, "aashirvaad"),
    ("oils-ghee", "Wood Pressed Groundnut Oil", "wood-pressed-groundnut-oil", "Traditional chekku groundnut oil, unrefined.", "1 L", 389, 449, 35, "oil", True, True, True, "saffola"),
    ("oils-ghee", "A2 Desi Cow Ghee", "a2-desi-cow-ghee", "Bilona method hand-churned cow ghee.", "500 ml", 799, 999, 20, "ghee", True, True, True, "nandini"),
    ("oils-ghee", "Cold Pressed Coconut Oil", "cold-pressed-coconut-oil", "Pure virgin coconut oil for cooking and pooja.", "1 L", 449, 529, 30, "coconut", False, False, True, "saffola"),
    ("spices-masala", "Turmeric Powder", "turmeric-powder", "Organic single-origin haldi powder.", "200 g", 89, 119, 150, "turmeric", False, True, True, "24-mantra"),
    ("spices-masala", "Kumkum Powder", "kumkum-powder", "Traditional temple-grade kumkum.", "100 g", 69, 89, 140, "pooja", True, False, False, None),
    ("spices-masala", "Sambar Masala", "sambar-masala", "Freshly ground authentic sambar masala.", "200 g", 129, 159, 75, "dal", False, False, True, "tata-sampann"),
    ("dry-fruits", "Premium Almonds", "premium-almonds", "California almonds, crisp and fresh.", "500 g", 549, 699, 40, "almonds", True, True, True, None),
    ("dry-fruits", "Cashew Nuts W240", "cashew-nuts-w240", "Whole white cashews, grade W240.", "500 g", 649, 799, 25, "cashew", False, True, False, None),
    ("dry-fruits", "Seedless Raisins", "seedless-raisins", "Sun-dried golden kishmish.", "250 g", 179, 219, 60, "raisins", False, False, True, None),
    ("snacks-sweets", "Mysore Pak", "mysore-pak", "Ghee-rich traditional Mysore Pak.", "500 g", 399, 449, 20, "mysore", True, False, True, None),
    ("snacks-sweets", "Ribbon Pakoda", "ribbon-pakoda", "Crispy homemade ribbon pakoda.", "250 g", 149, 179, 50, "pakoda", False, True, False, None),
    ("puja-flowers", "Marigold Garland", "marigold-garland", "Fresh marigold garland, 3 feet.", "1 piece", 199, 249, 18, "marigold", True, True, True, None),
    ("puja-flowers", "Lotus Flowers", "lotus-flowers", "Fresh lotus for special pooja, pack of 5.", "Pack of 5", 299, 349, 10, "lotus", False, False, True, None),
]

# Extra pack-size variants for selected products: (product_slug, label, unit, unit_value, price, mrp, stock, is_default)
PRODUCT_VARIANTS = [
    ("sona-masoori-rice", "5 kg", "kg", 5, 449, 549, 60, True),
    ("sona-masoori-rice", "10 kg", "kg", 10, 849, 999, 30, False),
    ("basmati-rice-premium", "1 kg", "kg", 1, 199, 249, 90, True),
    ("basmati-rice-premium", "5 kg", "kg", 5, 899, 1099, 25, False),
    ("a2-desi-cow-ghee", "500 ml", "ml", 500, 799, 999, 20, True),
    ("a2-desi-cow-ghee", "1 L", "ml", 1000, 1499, 1799, 12, False),
    ("wood-pressed-groundnut-oil", "1 L", "L", 1, 389, 449, 35, True),
    ("wood-pressed-groundnut-oil", "5 L", "L", 5, 1799, 2099, 10, False),
    ("toor-dal", "1 kg", "kg", 1, 169, 199, 70, True),
    ("toor-dal", "500 g", "g", 500, 89, 109, 100, False),
    ("premium-almonds", "500 g", "g", 500, 549, 699, 40, True),
    ("premium-almonds", "250 g", "g", 250, 299, 379, 55, False),
]

BLOG_POSTS = [
    (
        "How to set up a simple daily pooja at home",
        "simple-daily-pooja-setup",
        "A calm five-minute routine using everyday essentials from your kitchen shelf.",
        "A daily pooja does not need to be elaborate. Begin with a clean surface, a lamp, and a few flowers.\n\n## What you need\n- A brass or clay lamp with sesame or ghee oil\n- Agarbatti or sambrani\n- Fresh flowers and a small plate for prasad\n\n## The routine\nLight the lamp, offer the flowers, and sit quietly for two minutes. Consistency matters far more than scale.",
        "Sri Mahalakshmi Stores",
        ["pooja", "rituals"],
        4,
        IMG["pooja"],
    ),
    (
        "Choosing cold-pressed oils for everyday cooking",
        "choosing-cold-pressed-oils",
        "Groundnut, sesame or coconut — what changes in flavour, smoke point and nutrition.",
        "Cold-pressed oils retain more of the seed's natural aroma because they are crushed slowly without heat.\n\n## Quick guide\n- **Groundnut**: high smoke point, great for frying\n- **Sesame**: earthy, ideal for tempering and pooja lamps\n- **Coconut**: sweet finish, best for South Indian curries\n\nStore in a dark bottle away from the stove.",
        "Sri Mahalakshmi Stores",
        ["grocery", "kitchen"],
        5,
        IMG["oil"],
    ),
    (
        "A monthly staples checklist for a family of four",
        "monthly-staples-checklist",
        "Plan one trip a month and stop the small daily top-ups.",
        "Buying staples monthly saves both money and time.\n\n## Grains and pulses\n10 kg rice, 3 kg toor dal, 2 kg urad dal, 2 kg besan.\n\n## Oils and spices\n5 L cooking oil, 500 g each of chilli, turmeric and coriander powder.\n\n## Pooja shelf\nCamphor, agarbatti, cotton wicks and a spare lamp oil bottle.",
        "Sri Mahalakshmi Stores",
        ["grocery", "planning"],
        3,
        IMG["rice"],
    ),
]