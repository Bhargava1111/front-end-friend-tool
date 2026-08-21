from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsAuthenticatedUser
from catalog.models import Product, Review
from catalog.serializers import ReviewSerializer
from orders.models import Order
from storeops.models import (
    BOGOPromotion,
    CategoryDiscount,
    Feedback,
    BulkOrderRequest,
    LoyaltyAccount,
    PriceWatch,
    PushSubscription,
    ReferralCode,
    ReferralRedemption,
    ServiceablePincode,
    SupportTicket,
    WalletAccount,
    WalletTransaction,
)
from storeops.services.audit import log_activity
from storeops.services.notifications import credit_wallet, notify_user


class SupportTicketView(APIView):
    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required."}, status=401)
        tickets = (
            SupportTicket.objects.filter(user=request.user)
            .select_related("order")
            .order_by("-created_at")
        )
        return Response([
            {
                "id": str(t.id),
                "subject": t.subject,
                "message": t.message,
                "category": t.category,
                "status": t.status,
                "order_id": str(t.order_id) if t.order_id else None,
                "order_number": t.order.order_number if t.order_id else None,
                "admin_response": t.admin_notes or None,
                "created_at": t.created_at.isoformat(),
                "updated_at": t.updated_at.isoformat(),
            }
            for t in tickets
        ])

    def post(self, request):
        data = request.data
        nested = data.get("data") if hasattr(data, "get") else None
        if isinstance(nested, dict) and not (data.get("message") or data.get("subject")):
            data = nested
        user = request.user if getattr(request.user, "is_authenticated", False) else None
        order = None
        order_id = data.get("order_id")
        if order_id and user:
            try:
                order = Order.objects.filter(id=order_id, user=user).first()
            except (ValueError, TypeError, ValidationError):
                order = None

        name = (data.get("name") or (user.full_name if user else "") or "").strip()[:120]
        email = (data.get("email") or (user.email if user else "") or "").strip()[:254]
        phone = (data.get("phone") or (user.phone if user else "") or "").strip()[:15]
        subject = (data.get("subject") or "Support request").strip()[:255]
        message = (data.get("message") or "").strip()
        category = data.get("category") or "other"
        valid_categories = {c[0] for c in SupportTicket.Category.choices}
        if category not in valid_categories:
            category = "other"
        if len(message) < 8:
            return Response({"detail": "Please describe the issue in a bit more detail."}, status=400)
        if not name:
            return Response({"detail": "Please enter your name."}, status=400)

        ticket = SupportTicket.objects.create(
            user=user,
            name=name,
            email=email,
            phone=phone,
            subject=subject or "Support request",
            message=message,
            category=category,
            order=order,
        )

        try:
            for admin in User.objects.filter(role="admin", is_active=True):
                notify_user(
                    admin,
                    "New support ticket",
                    f"{ticket.name}: {ticket.subject}",
                    "system",
                    link="/admin/tickets",
                )
        except Exception:
            pass

        return Response({"id": str(ticket.id), "ok": True, "status": ticket.status}, status=201)


class FeedbackView(APIView):
    def post(self, request):
        data = request.data
        Feedback.objects.create(
            user=request.user if request.user.is_authenticated else None,
            rating=int(data.get("rating", 5)),
            message=data.get("message", ""),
            page=data.get("page", "feedback"),
        )
        return Response({"ok": True}, status=201)


class BulkOrderView(APIView):
    def post(self, request):
        data = request.data
        name = (data.get("name") or "").strip()
        phone = (data.get("phone") or "").strip()
        items_text = (data.get("items_text") or data.get("items") or "").strip()
        if not name or not phone or not items_text:
            return Response({"detail": "Name, phone and items are required."}, status=400)
        req = BulkOrderRequest.objects.create(
            user=request.user if request.user.is_authenticated else None,
            name=name,
            phone=phone,
            items_text=items_text,
            estimated_qty=int(data.get("estimated_qty") or data.get("quantity") or 0),
        )
        try:
            for admin in User.objects.filter(role="admin", is_active=True):
                notify_user(
                    admin,
                    "New bulk order request",
                    f"{req.name} — {req.estimated_qty or '?'} units",
                    "system",
                    link="/admin/bulk-orders",
                )
        except Exception:
            pass
        return Response({"id": str(req.id), "ok": True}, status=201)


class PincodeCheckView(APIView):
    def get(self, request):
        pincode = request.query_params.get("pincode", "").strip()
        if len(pincode) != 6:
            return Response({"serviceable": False, "message": "Enter a valid 6-digit pincode."})
        row = ServiceablePincode.objects.filter(pincode=pincode, is_active=True).first()
        if row:
            return Response({"serviceable": True, "city": row.city, "pincode": row.pincode})
        count = ServiceablePincode.objects.filter(is_active=True).count()
        if count == 0:
            return Response({"serviceable": True, "pincode": pincode, "message": "Delivery available"})
        return Response({"serviceable": False, "message": "Sorry, we don't deliver to this pincode yet."})


class WalletView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        wallet, _ = WalletAccount.objects.get_or_create(user=request.user)
        txs = WalletTransaction.objects.filter(wallet=wallet).order_by("-created_at")[:50]
        return Response({
            "balance": float(wallet.balance),
            "transactions": [{
                "id": str(t.id),
                "type": t.type,
                "amount": float(t.amount),
                "description": t.description,
                "created_at": t.created_at.isoformat(),
            } for t in txs],
        })


class LoyaltyView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        account, _ = LoyaltyAccount.objects.get_or_create(user=request.user)
        return Response({
            "points": account.points,
            "lifetime_points": account.lifetime_points,
            "tier": account.tier,
        })


class ReferralView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        code, _ = ReferralCode.objects.get_or_create(
            user=request.user,
            defaults={"code": f"MNX{str(request.user.id).replace('-', '')[:8].upper()}"},
        )
        redemptions = ReferralRedemption.objects.filter(referrer=request.user).count()
        return Response({
            "code": code.code,
            "total_referrals": redemptions,
            "total_earned": float(code.total_earned),
        })

    def post(self, request):
        code_str = (request.data.get("code") or "").strip().upper()
        if not code_str:
            return Response({"detail": "Enter a referral code."}, status=400)
        if ReferralRedemption.objects.filter(referred=request.user).exists():
            return Response({"detail": "You already used a referral code."}, status=400)
        ref = ReferralCode.objects.filter(code=code_str).select_related("user").first()
        if not ref or ref.user_id == request.user.id:
            return Response({"detail": "Invalid referral code."}, status=400)
        ReferralRedemption.objects.create(referrer=ref.user, referred=request.user, reward_amount=50)
        ref.total_referrals += 1
        ref.total_earned += Decimal("50")
        ref.save()
        credit_wallet(ref.user, Decimal("50"), "Referral reward", code_str)
        credit_wallet(request.user, Decimal("25"), "Welcome referral bonus", code_str)
        return Response({"ok": True, "bonus": 25})


class PriceWatchView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        watches = PriceWatch.objects.filter(user=request.user).select_related("product")
        return Response([{
            "id": str(w.id),
            "product_id": str(w.product_id),
            "product_name": w.product.name,
            "last_price": float(w.last_price),
            "target_price": float(w.target_price) if w.target_price else None,
        } for w in watches])

    def post(self, request):
        product = Product.objects.get(id=request.data.get("product_id"))
        watch, _ = PriceWatch.objects.update_or_create(
            user=request.user,
            product=product,
            defaults={
                "last_price": product.price,
                "target_price": request.data.get("target_price"),
                "notified": False,
            },
        )
        return Response({"id": str(watch.id), "ok": True}, status=201)

    def delete(self, request):
        PriceWatch.objects.filter(user=request.user, product_id=request.data.get("product_id")).delete()
        return Response(status=204)


class PushSubscribeView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def post(self, request):
        data = request.data
        endpoint = (data.get("endpoint") or "").strip()
        keys = data.get("keys") or {}
        if not endpoint:
            return Response({"detail": "Push endpoint is required."}, status=400)
        if not keys.get("p256dh") or not keys.get("auth"):
            return Response({"detail": "Push subscription keys are required."}, status=400)
        PushSubscription.objects.update_or_create(
            user=request.user,
            endpoint=endpoint,
            defaults={"keys": keys},
        )
        return Response({"ok": True})


class AppConfigView(APIView):
    def get(self, request):
        from accounts.models import AppSetting

        settings_map = {r.key: r.value for r in AppSetting.objects.all()}
        return Response({
            "app_version": settings_map.get("app_version", {"version": "2.5.0", "force_update": False}),
            "gst": settings_map.get("gst", {"cgst": 2.5, "sgst": 2.5, "hsn": "2106"}),
            "payment_gateway": settings_map.get("payment_gateway", {"provider": "demo", "enabled_methods": ["cod", "upi", "card"]}),
            "vapid_public_key": settings.VAPID_PUBLIC_KEY or None,
        })


class AccountDeleteView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def post(self, request):
        user = request.user
        if Order.objects.filter(user=user, status__in=["pending", "confirmed", "packed"]).exists():
            return Response({"detail": "Cancel active orders before deleting your account."}, status=400)
        log_activity(user, "account.delete", "user", user.id, request=request)
        user.is_active = False
        user.email = f"deleted_{user.id}@deleted.local"
        user.phone = None
        user.full_name = "Deleted User"
        user.save()
        return Response({"ok": True})


class ProductReviewSubmitView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def post(self, request, product_id):
        data = request.data
        review = Review.objects.create(
            product_id=product_id,
            user=request.user,
            author_name=data.get("author_name") or request.user.full_name or "Customer",
            rating=int(data.get("rating", 5)),
            title=data.get("title", ""),
            body=data.get("body", ""),
            is_approved=False,
        )
        return Response(ReviewSerializer(review).data, status=201)


class PaymentIntentView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def post(self, request):
        from storeops.models import Payment
        from storeops.services.payments import create_payment_intent

        order = Order.objects.get(id=request.data.get("order_id"), user=request.user)
        method = request.data.get("method", "upi")
        intent = create_payment_intent(order, method)
        payment = Payment.objects.create(
            order=order,
            user=request.user,
            method=method,
            amount=order.total,
            gateway=intent.get("gateway", "demo"),
            gateway_order_id=intent.get("order_id", ""),
        )
        return Response({**intent, "payment_id": str(payment.id)})


class PaymentVerifyView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def post(self, request):
        from storeops.models import Payment
        from storeops.services.payments import verify_payment

        payment = Payment.objects.get(id=request.data.get("payment_id"), user=request.user)
        ok = verify_payment(
            payment.gateway,
            request.data.get("gateway_order_id", payment.gateway_order_id),
            request.data.get("gateway_payment_id", ""),
            request.data.get("signature", ""),
        )
        if ok:
            payment.status = Payment.Status.SUCCESS
            payment.gateway_payment_id = request.data.get("gateway_payment_id", "")
            payment.save()
            payment.order.payment_status = "paid"
            payment.order.save(update_fields=["payment_status"])
            return Response({"ok": True, "status": "success"})
        payment.status = Payment.Status.FAILED
        payment.failure_reason = "Verification failed"
        payment.save()
        return Response({"ok": False, "status": "failed"}, status=400)


class OrderInvoiceView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request, pk):
        from accounts.models import AppSetting, Profile

        order = Order.objects.prefetch_related("order_items").get(id=pk, user=request.user)
        settings_map = {r.key: r.value for r in AppSetting.objects.all()}
        gst = settings_map.get("gst", {"cgst": 2.5, "sgst": 2.5, "hsn": "2106", "rate": 5})
        gst_rate = float(gst.get("rate", 5))
        if not order.invoice_number:
            seq = order.order_number.replace("MNX-", "")
            order.invoice_number = f"SMA/{seq}/25-26"
            order.save(update_fields=["invoice_number"])
        taxable = float(order.subtotal - order.discount)
        half = gst_rate / 2
        cgst = round(taxable * half / 100, 2)
        sgst = round(taxable * half / 100, 2)
        buyer_gstin = ""
        if order.user_id:
            buyer_gstin = Profile.objects.filter(user_id=order.user_id).values_list("gst_number", flat=True).first() or ""
        company = settings_map.get("invoice_company", {
            "legalName": "SREE MAHALAKSHMI AGENCIES - (25-26)",
            "addressLines": ["3-3-134 Aryanagar Zaheerabad", "Dist Sangareddy - 502220"],
            "state": "Telangana",
            "stateCode": "36",
            "phones": "9866900005, 9170256789, 9120756789",
            "email": "Sreemahalakshmiagencieszhb@gmail.com",
            "gstin": "36AJAPA6782A1ZO",
            "defaultHsn": gst.get("hsn", "2106"),
            "defaultGstPercent": gst_rate,
        })
        return Response({
            "invoice_number": order.invoice_number,
            "order_number": order.order_number,
            "date": order.created_at.isoformat(),
            "customer": {
                "name": order.recipient_name,
                "phone": order.phone,
                "address": order.address_text,
                "gstin": buyer_gstin or None,
            },
            "items": [{
                "name": i.product_name,
                "qty": i.quantity,
                "unit": i.variant_label or i.product_weight or "Pcs",
                "unit_price": float(i.unit_price),
                "line_total": float(i.line_total),
                "hsn": gst.get("hsn", "2106"),
                "gst_percent": gst_rate,
                "discount_percent": 0,
            } for i in order.order_items.all()],
            "subtotal": float(order.subtotal),
            "discount": float(order.discount),
            "delivery_fee": float(order.delivery_fee),
            "cgst": round(cgst, 2),
            "sgst": round(sgst, 2),
            "tax": float(order.tax),
            "total": float(order.total),
            "payment_method": order.payment_method,
            "payment_status": order.payment_status,
            "company": company,
        })


class ActivePromotionsView(APIView):
    def get(self, request):
        now = timezone.now()
        bogo = BOGOPromotion.objects.filter(is_active=True).select_related("buy_product", "get_product")
        bogo = [b for b in bogo if (not b.starts_at or b.starts_at <= now) and (not b.ends_at or b.ends_at >= now)]
        cat_disc = CategoryDiscount.objects.filter(is_active=True).select_related("category")
        cat_disc = [d for d in cat_disc if (not d.starts_at or d.starts_at <= now) and (not d.ends_at or d.ends_at >= now)]
        return Response({
            "bogo": [{
                "id": str(b.id),
                "name": b.name,
                "buy_product_id": str(b.buy_product_id),
                "get_product_id": str(b.get_product_id),
                "get_quantity": b.get_quantity,
            } for b in bogo],
            "category_discounts": [{
                "category_id": str(d.category_id),
                "category_slug": d.category.slug,
                "discount_percent": float(d.discount_percent),
            } for d in cat_disc],
        })
