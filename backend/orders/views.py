from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import AppSetting, Profile, User
from accounts.permissions import IsAdminRole, IsAuthenticatedUser
from catalog.models import Product, ProductVariant
from catalog.pricing import normalize_price_tiers, unit_price_for_qty
from catalog.serializers import CartItemSerializer, OrderSerializer, WishlistItemSerializer
from notifications.models import Notification
from orders.models import CartItem, Coupon, Order, OrderItem, OrderReturn, WishlistItem
from storeops.services.notifications import notify_user


def next_order_number():
    last = Order.objects.order_by("-created_at").first()
    if last and last.order_number.startswith("MNX-"):
        try:
            num = int(last.order_number.split("-")[1]) + 1
        except ValueError:
            num = 1001
    else:
        num = 1001
    return f"MNX-{num}"


def get_settings():
    rows = AppSetting.objects.all()
    return {r.key: r.value for r in rows}


class CartView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        items = CartItem.objects.filter(user=request.user).select_related("product", "variant")
        subtotal = sum(
            unit_price_for_qty(line.product, line.variant, line.quantity) * line.quantity
            for line in items
        )
        settings_map = get_settings()
        delivery_base = Decimal(str(settings_map.get("delivery_fee", settings.DEFAULT_DELIVERY_FEE)))
        free_above = Decimal(str(settings_map.get("free_delivery_above", settings.DEFAULT_FREE_DELIVERY_ABOVE)))
        delivery_fee = Decimal(0) if subtotal >= free_above else delivery_base
        return Response({
            "items": CartItemSerializer(items, many=True).data,
            "subtotal": float(subtotal),
            "delivery_fee": float(delivery_fee),
            "total": float(subtotal + delivery_fee),
            "savings": 0,
        })

    def post(self, request):
        product_id = request.data.get("product_id") or request.data.get("productId")
        variant_id = request.data.get("variant_id") or request.data.get("variantId")
        quantity = int(request.data.get("quantity", 1))
        product = Product.objects.get(id=product_id)
        variant = ProductVariant.objects.filter(id=variant_id).first() if variant_id else None
        item, created = CartItem.objects.get_or_create(
            user=request.user, product=product, variant=variant,
            defaults={"quantity": quantity},
        )
        if not created:
            item.quantity += quantity
            item.save()
        try:
            from analytics.models import JourneyEvent
            from analytics.services import analytics_session_id, record_journey

            sid = analytics_session_id(request, request.data)
            if sid:
                record_journey(
                    request=request,
                    event_type=JourneyEvent.EventType.ADD_TO_CART,
                    session_id=sid,
                    search_id=request.data.get("search_id") or request.data.get("searchId"),
                    product=product,
                )
        except Exception:
            pass
        return Response({"ok": True}, status=201)

    def delete(self, request):
        CartItem.objects.filter(user=request.user).delete()
        return Response(status=204)


class CartDetailView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def patch(self, request, pk):
        item = CartItem.objects.get(id=pk, user=request.user)
        quantity = int(request.data.get("quantity", 1))
        if quantity <= 0:
            item.delete()
            return Response({"ok": True})
        item.quantity = quantity
        item.save()
        return Response({"ok": True})

    def delete(self, request, pk):
        CartItem.objects.filter(id=pk, user=request.user).delete()
        return Response(status=204)


class WishlistView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        items = WishlistItem.objects.filter(user=request.user).select_related("product")
        return Response(WishlistItemSerializer(items, many=True).data)

    def post(self, request):
        product_id = request.data.get("product_id") or request.data.get("productId")
        product = Product.objects.get(id=product_id)
        deleted, _ = WishlistItem.objects.filter(user=request.user, product=product).delete()
        if deleted:
            return Response({"wishlisted": False})
        WishlistItem.objects.create(user=request.user, product=product)
        return Response({"wishlisted": True}, status=201)


class WishlistDetailView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def delete(self, request, product_id):
        WishlistItem.objects.filter(user=request.user, product_id=product_id).delete()
        return Response(status=204)


class OrderListView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        orders = Order.objects.filter(user=request.user).prefetch_related("order_items").order_by("-created_at")
        return Response(OrderSerializer(orders, many=True).data)

    @transaction.atomic
    def post(self, request):
        profile = Profile.objects.filter(user=request.user).first()
        if not profile or profile.verification_status != Profile.VerificationStatus.VERIFIED:
            return Response({"detail": "Your account is awaiting verification."}, status=403)

        address_id = request.data.get("address_id") or request.data.get("addressId")
        from accounts.models import Address
        address = Address.objects.get(id=address_id, user=request.user)

        cart = CartItem.objects.filter(user=request.user).select_related("product", "variant")
        if not cart.exists():
            return Response({"detail": "Your cart is empty."}, status=400)

        subtotal = Decimal(0)
        lines = []
        for line in cart:
            unit = unit_price_for_qty(line.product, line.variant, line.quantity)
            subtotal += unit * line.quantity
            lines.append((line, unit))

        settings_map = get_settings()
        delivery_base = Decimal(str(settings_map.get("delivery_fee", settings.DEFAULT_DELIVERY_FEE)))
        free_above = Decimal(str(settings_map.get("free_delivery_above", settings.DEFAULT_FREE_DELIVERY_ABOVE)))
        tax_rate = Decimal(str(settings_map.get("tax_rate", settings.DEFAULT_TAX_RATE)))

        discount = Decimal(0)
        free_shipping = False
        coupon_code = request.data.get("couponCode") or request.data.get("coupon_code")
        if coupon_code:
            coupon = Coupon.objects.filter(code=coupon_code.upper(), is_active=True).first()
            if coupon and subtotal >= coupon.min_order:
                if coupon.discount_type == "percent":
                    discount = subtotal * coupon.discount_value / 100
                    if coupon.max_discount:
                        discount = min(discount, coupon.max_discount)
                elif coupon.discount_type == "flat":
                    discount = coupon.discount_value
                elif coupon.discount_type == "free_shipping":
                    free_shipping = True

        delivery_fee = Decimal(0) if free_shipping or subtotal >= free_above else delivery_base
        tax = ((subtotal - discount) * tax_rate / 100).quantize(Decimal("1"))
        total = subtotal - discount + delivery_fee + tax

        order = Order.objects.create(
            user=request.user,
            order_number=next_order_number(),
            subtotal=subtotal,
            delivery_fee=delivery_fee,
            discount=discount,
            tax=tax,
            total=total,
            coupon_code=coupon_code or "",
            payment_method=request.data.get("paymentMethod", "cod"),
            delivery_slot=request.data.get("deliverySlot", ""),
            recipient_name=address.recipient_name,
            phone=address.phone,
            address_text=", ".join(filter(None, [address.line1, address.line2, address.city, address.state, address.pincode])),
            notes=request.data.get("notes", ""),
        )

        for line, unit in lines:
            OrderItem.objects.create(
                order=order,
                product=line.product,
                variant=line.variant,
                product_name=line.product.name,
                product_weight=line.variant.label if line.variant else line.product.weight,
                variant_label=line.variant.label if line.variant else "",
                image_url=line.variant.image_url if line.variant and line.variant.image_url else line.product.image_url,
                unit_price=unit,
                quantity=line.quantity,
                line_total=unit * line.quantity,
            )
            if line.variant:
                line.variant.stock = max(0, line.variant.stock - line.quantity)
                line.variant.save()
            else:
                line.product.stock = max(0, line.product.stock - line.quantity)
                line.product.save()

        cart.delete()

        try:
            from analytics.services import analytics_session_id, record_purchase

            record_purchase(
                request=request,
                order=order,
                session_id=analytics_session_id(request, request.data),
                search_id=request.data.get("search_id") or request.data.get("searchId"),
            )
        except Exception:
            pass

        notify_user(
            request.user,
            "Order placed",
            f"Your order {order.order_number} has been placed.",
            Notification.Type.ORDER,
            order=order,
            link=f"/orders/{order.id}",
        )
        for admin in User.objects.filter(role="admin"):
            notify_user(
                admin,
                "New order",
                f"Order {order.order_number} received.",
                Notification.Type.ADMIN_ORDER,
                order=order,
                link=f"/admin/orders/{order.id}",
            )

        return Response({"id": order.id, "order_number": order.order_number, "orderNumber": order.order_number}, status=201)


class OrderDetailView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request, pk):
        order = Order.objects.filter(id=pk, user=request.user).prefetch_related("order_items").first()
        if not order:
            return Response({"detail": "Not found."}, status=404)
        return Response(OrderSerializer(order).data)


class OrderCancelView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def post(self, request, pk):
        order = Order.objects.filter(id=pk, user=request.user, status="pending").first()
        if not order:
            return Response({"detail": "Cannot cancel."}, status=400)
        order.status = "cancelled"
        order.save()
        from storeops.services.notifications import notify_order_status
        notify_order_status(order)
        return Response({"ok": True})


class OrderReturnView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        order_id = request.query_params.get("order_id")
        qs = OrderReturn.objects.filter(user=request.user).select_related("order")
        if order_id:
            qs = qs.filter(order_id=order_id)
        return Response([{
            "id": str(r.id),
            "order_id": str(r.order_id),
            "reason": r.reason,
            "details": r.details,
            "status": r.status,
            "created_at": r.created_at.isoformat(),
        } for r in qs.order_by("-created_at")])

    def post(self, request):
        order_id = request.data.get("order_id") or request.data.get("orderId")
        ret = OrderReturn.objects.create(
            order_id=order_id,
            user=request.user,
            reason=request.data.get("reason", ""),
            details=request.data.get("details", ""),
        )
        return Response({"id": ret.id}, status=201)
