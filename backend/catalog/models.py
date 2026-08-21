import uuid

from django.db import models


class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    parent = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="children"
    )
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True, default="")
    image_url = models.URLField(blank=True, default="")
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Brand(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    tagline = models.CharField(max_length=120, blank=True, default="")
    logo_url = models.URLField(blank=True, default="")
    banner_url = models.URLField(blank=True, default="")
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Product(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True, default="")
    weight = models.CharField(max_length=50, blank=True, default="")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    mrp = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    stock = models.IntegerField(default=0)
    image_url = models.URLField(blank=True, default="")
    video_url = models.URLField(blank=True, default="")
    benefits = models.JSONField(default=list, blank=True)
    shelf_life = models.CharField(max_length=100, blank=True, default="")
    origin = models.CharField(max_length=100, blank=True, default="")
    rating = models.FloatField(null=True, blank=True)
    rating_count = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    is_best_seller = models.BooleanField(default=False)
    is_recommended = models.BooleanField(default=False)
    is_combo = models.BooleanField(default=False)
    combo_items = models.JSONField(default=list, blank=True)
    # Qty price breaks: [{"min_qty": 1, "max_qty": 2, "unit_price": 230.99}, ...]
    price_tiers = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class ProductImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image_url = models.URLField()
    sort_order = models.IntegerField(default=0)


class ProductVariant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    label = models.CharField(max_length=100)
    unit = models.CharField(max_length=20, default="")
    unit_value = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    mrp = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    stock = models.IntegerField(default=0)
    sku = models.CharField(max_length=50, blank=True, default="")
    image_url = models.URLField(blank=True, default="")
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("product", "label")]


class Banner(models.Model):
    class Placement(models.TextChoices):
        HOME = "home", "Home"
        OFFERS = "offers", "Offers"
        FESTIVE = "festive", "Festive"
        COUPONS = "coupons", "Coupons"
        BRANDS = "brands", "Brands"
        COMBOS = "combos", "Combos"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=255, blank=True, default="")
    image_url = models.URLField(max_length=500, blank=True, default="")
    link_slug = models.CharField(max_length=100, blank=True, default="")
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    placement = models.CharField(max_length=20, choices=Placement.choices, default=Placement.HOME)
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True)
    coupon = models.ForeignKey("orders.Coupon", on_delete=models.SET_NULL, null=True, blank=True)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name="combo_banners")
    created_at = models.DateTimeField(auto_now_add=True)


class Review(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True)
    author_name = models.CharField(max_length=120, blank=True, default="")
    rating = models.IntegerField()
    title = models.CharField(max_length=255, blank=True, default="")
    body = models.TextField(blank=True, default="")
    image_url = models.URLField(blank=True, default="")
    is_approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class ProductOfferPlacement(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="offer_placements")
    section = models.CharField(max_length=50, db_index=True)
    sort_order = models.IntegerField(default=0)
    offer_label = models.CharField(max_length=80, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("product", "section")]
        ordering = ["sort_order", "-created_at"]


class HomeOfferSection(models.Model):
    class Layout(models.TextChoices):
        RAIL = "rail", "Product rail"
        COUNTDOWN_RAIL = "countdown_rail", "Flash sale (countdown)"
        BUDGET_RAIL = "budget_rail", "Budget store rail"
        DEAL_CARD = "deal_card", "Deal of the day card"

    class FallbackRule(models.TextChoices):
        MANUAL = "manual", "Manual products only"
        DISCOUNTED = "discounted", "Top discounted"
        FEATURED = "featured", "Featured products"
        UNDER_99 = "under_99", "Under ₹99"
        BEST_SELLER = "best_seller", "Best sellers"
        NEWEST = "newest", "Newly added"
        RECOMMENDED = "recommended", "Recommended"
        COMBO = "combo", "Combo packs"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.SlugField(max_length=50, unique=True)
    title = models.CharField(max_length=120)
    subtitle = models.CharField(max_length=255, blank=True, default="")
    layout = models.CharField(max_length=30, choices=Layout.choices, default=Layout.RAIL)
    fallback_rule = models.CharField(max_length=30, choices=FallbackRule.choices, default=FallbackRule.MANUAL)
    see_all_tab = models.CharField(max_length=30, blank=True, default="")
    max_products = models.PositiveSmallIntegerField(default=12)
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    show_on_home = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "title"]

    def __str__(self):
        return self.title
