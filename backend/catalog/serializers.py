from decimal import Decimal

from rest_framework import serializers

from catalog.models import Banner, Brand, Category, HomeOfferSection, Product, ProductImage, ProductVariant, Review
from orders.models import CartItem, Coupon, Order, OrderItem, OrderReturn, WishlistItem


def decimal_to_float(val):
    if val is None:
        return None
    return float(val)


class ProductVariantSerializer(serializers.ModelSerializer):
    price = serializers.SerializerMethodField()
    mrp = serializers.SerializerMethodField()
    unit_value = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = (
            "id", "product_id", "label", "unit", "unit_value", "price", "mrp",
            "stock", "sku", "image_url", "is_default", "is_active", "sort_order",
        )

    def get_price(self, obj):
        return decimal_to_float(obj.price)

    def get_mrp(self, obj):
        return decimal_to_float(obj.mrp)

    def get_unit_value(self, obj):
        return decimal_to_float(obj.unit_value)


class ProductSerializer(serializers.ModelSerializer):
    price = serializers.SerializerMethodField()
    mrp = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    combo_items = serializers.SerializerMethodField()
    variants = ProductVariantSerializer(many=True, read_only=True)
    category_id = serializers.UUIDField(read_only=True)
    brand_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = Product
        fields = (
            "id", "name", "slug", "description", "weight", "price", "mrp", "stock",
            "image_url", "video_url", "is_featured", "is_best_seller", "is_recommended",
            "category_id", "brand_id", "benefits", "shelf_life", "origin", "rating",
            "rating_count", "images", "variants", "price_tiers", "is_active", "is_combo",
            "combo_items",
        )

    def get_price(self, obj):
        return decimal_to_float(obj.price)

    def get_mrp(self, obj):
        return decimal_to_float(obj.mrp)

    def get_images(self, obj):
        gallery = [img.image_url for img in obj.images.all().order_by("sort_order")]
        if obj.image_url:
            return [obj.image_url] + [u for u in gallery if u != obj.image_url]
        return gallery

    def get_combo_items(self, obj):
        if not obj.is_combo:
            return []
        items = obj.combo_items or []
        if not items:
            return []
        ids = [item.get("product_id") for item in items if item.get("product_id")]
        products = Product.objects.filter(id__in=ids)
        by_id = {str(p.id): p for p in products}
        resolved = []
        for item in items:
            pid = str(item.get("product_id") or "")
            product = by_id.get(pid)
            if not product:
                continue
            resolved.append({
                "product_id": pid,
                "quantity": item.get("quantity", 1),
                "name": product.name,
                "image_url": product.image_url,
                "price": decimal_to_float(product.price),
            })
        return resolved


class CategorySerializer(serializers.ModelSerializer):
    parent_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = Category
        fields = ("id", "name", "slug", "description", "image_url", "sort_order", "is_active", "parent_id")


class HomeOfferSectionSerializer(serializers.ModelSerializer):
    placed_count = serializers.SerializerMethodField()
    display_count = serializers.SerializerMethodField()
    resolved_product_ids = serializers.SerializerMethodField()

    class Meta:
        model = HomeOfferSection
        fields = (
            "id", "key", "title", "subtitle", "layout", "fallback_rule",
            "see_all_tab", "max_price", "max_products", "sort_order", "is_active", "show_on_home",
            "placed_count", "display_count", "resolved_product_ids",
        )

    def get_placed_count(self, obj):
        from catalog.models import ProductOfferPlacement
        return ProductOfferPlacement.objects.filter(section=obj.key).count()

    def get_display_count(self, obj):
        return len(self.get_resolved_product_ids(obj))

    def get_resolved_product_ids(self, obj):
        from catalog.placements import resolve_section_product_ids
        ctx = self.context.get("sections_map")
        all_serialized = self.context.get("all_serialized") or []
        return resolve_section_product_ids(obj, ctx, all_serialized)


class BannerSerializer(serializers.ModelSerializer):
    coupon_id = serializers.UUIDField(read_only=True)
    brand_id = serializers.UUIDField(read_only=True)
    product_id = serializers.UUIDField(read_only=True)
    product = serializers.SerializerMethodField()

    class Meta:
        model = Banner
        fields = (
            "id", "title", "subtitle", "image_url", "link_slug", "placement",
            "sort_order", "coupon_id", "brand_id", "product_id", "product", "is_active",
        )

    def get_product(self, obj):
        if not obj.product_id:
            return None
        return ProductSerializer(obj.product).data


class BrandSerializer(serializers.ModelSerializer):
    products = serializers.SerializerMethodField()

    class Meta:
        model = Brand
        fields = ("id", "name", "slug", "tagline", "logo_url", "banner_url", "sort_order", "products")

    def get_products(self, obj):
        qs = Product.objects.filter(brand=obj, is_active=True).order_by("name")[:10]
        return ProductSerializer(qs, many=True).data


class CouponSerializer(serializers.ModelSerializer):
    discount_value = serializers.SerializerMethodField()
    min_order = serializers.SerializerMethodField()
    max_discount = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = (
            "id", "code", "title", "description", "discount_type", "discount_value",
            "min_order", "max_discount", "starts_at", "ends_at", "banner_url", "is_active",
        )

    def get_discount_value(self, obj):
        return decimal_to_float(obj.discount_value)

    def get_min_order(self, obj):
        return decimal_to_float(obj.min_order)

    def get_max_discount(self, obj):
        return decimal_to_float(obj.max_discount)


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ("id", "product_id", "user_id", "author_name", "rating", "title", "body", "image_url", "is_approved", "created_at")


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    variant = ProductVariantSerializer(read_only=True)

    class Meta:
        model = CartItem
        fields = ("id", "quantity", "product", "variant")


class WishlistItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = WishlistItem
        fields = ("id", "product", "created_at")


class OrderItemSerializer(serializers.ModelSerializer):
    unit_price = serializers.SerializerMethodField()
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = (
            "id", "product_name", "product_weight", "variant_label", "image_url",
            "unit_price", "quantity", "line_total",
        )

    def get_unit_price(self, obj):
        return decimal_to_float(obj.unit_price)

    def get_line_total(self, obj):
        return decimal_to_float(obj.line_total)


class OrderSerializer(serializers.ModelSerializer):
    order_items = OrderItemSerializer(many=True, read_only=True)
    subtotal = serializers.SerializerMethodField()
    delivery_fee = serializers.SerializerMethodField()
    discount = serializers.SerializerMethodField()
    tax = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id", "user_id", "order_number", "status", "subtotal", "delivery_fee", "discount", "tax",
            "total", "coupon_code", "payment_method", "delivery_slot", "delivery_date",
            "recipient_name", "phone", "address_text", "notes", "created_at", "order_items",
        )

    def get_user_id(self, obj):
        return str(obj.user_id)

    def get_subtotal(self, obj):
        return decimal_to_float(obj.subtotal)

    def get_delivery_fee(self, obj):
        return decimal_to_float(obj.delivery_fee)

    def get_discount(self, obj):
        return decimal_to_float(obj.discount)

    def get_tax(self, obj):
        return decimal_to_float(obj.tax)

    def get_total(self, obj):
        return decimal_to_float(obj.total)


class OrderReturnSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderReturn
        fields = ("id", "order_id", "user_id", "reason", "details", "status", "created_at", "updated_at")
