from decimal import Decimal

from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsAdminRole
from orders.models import Order, OrderReturn
from storeops.models import (
    BOGOPromotion,
    CategoryDiscount,
    DeliveryAssignment,
    DeliveryRider,
    Feedback,
    Payment,
    Refund,
    ServiceablePincode,
    SupportTicket,
    UserActivityLog,
)
from storeops.permissions import has_module_access
from storeops.services.audit import log_activity
from storeops.services.messaging import send_email
from storeops.services.notifications import notify_order_status, notify_user, process_refund


class AdminModulePermission(IsAdminRole):
    module = ""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        module = getattr(view, "admin_module", None) or self.module
        if not module:
            return True
        return has_module_access(request.user, module)


class AdminTicketView(APIView):
    permission_classes = [IsAdminRole]
    admin_module = "tickets"

    def get(self, request):
        tickets = SupportTicket.objects.select_related("user", "order").order_by("-created_at")
        return Response([{
            "id": str(t.id),
            "name": t.name,
            "email": t.email,
            "phone": t.phone,
            "subject": t.subject,
            "message": t.message,
            "category": t.category,
            "status": t.status,
            "admin_notes": t.admin_notes,
            "order_id": str(t.order_id) if t.order_id else None,
            "order_number": t.order.order_number if t.order_id else None,
            "created_at": t.created_at.isoformat(),
        } for t in tickets])

    def patch(self, request):
        ticket = SupportTicket.objects.select_related("user").get(id=request.data.get("id"))
        previous_notes = (ticket.admin_notes or "").strip()
        previous_status = ticket.status

        if "status" in request.data:
            ticket.status = request.data["status"]
        if "admin_notes" in request.data:
            ticket.admin_notes = (request.data.get("admin_notes") or "").strip()
        ticket.save()

        new_notes = (ticket.admin_notes or "").strip()
        notes_changed = "admin_notes" in request.data and new_notes and new_notes != previous_notes
        status_changed = ticket.status != previous_status

        if notes_changed:
            self._notify_customer_reply(ticket, new_notes)
        elif status_changed and ticket.user_id:
            notify_user(
                ticket.user,
                f"Ticket update: {ticket.subject}",
                f"Your support ticket is now {ticket.status.replace('_', ' ')}.",
                "system",
                link="/support",
            )

        log_activity(request.user, "ticket.update", "ticket", ticket.id, request.data, request)
        return Response({"ok": True})

    @staticmethod
    def _notify_customer_reply(ticket: SupportTicket, response_text: str) -> None:
        title = f"Reply: {ticket.subject}"
        body = response_text[:2000]
        if ticket.user_id:
            notify_user(ticket.user, title, body, "system", link="/support")
        elif ticket.email:
            send_email(ticket.email, title, body)


class AdminFeedbackView(APIView):
    permission_classes = [AdminModulePermission]
    admin_module = "tickets"

    def get(self, request):
        rows = Feedback.objects.select_related("user").order_by("-created_at")[:100]
        return Response([{
            "id": str(f.id),
            "rating": f.rating,
            "message": f.message,
            "page": f.page,
            "user": f.user.full_name if f.user_id else "Guest",
            "created_at": f.created_at.isoformat(),
        } for f in rows])


class AdminActivityLogView(APIView):
    permission_classes = [AdminModulePermission]
    admin_module = "settings"

    def get(self, request):
        logs = UserActivityLog.objects.select_related("actor").order_by("-created_at")[:200]
        return Response([{
            "id": str(l.id),
            "actor": l.actor.full_name if l.actor_id else "System",
            "action": l.action,
            "resource": l.resource,
            "resource_id": l.resource_id,
            "details": l.details,
            "ip_address": l.ip_address,
            "created_at": l.created_at.isoformat(),
        } for l in logs])


class AdminUserManageView(APIView):
    permission_classes = [AdminModulePermission]
    admin_module = "users"

    def patch(self, request, pk):
        user = User.objects.get(id=pk)
        if "is_active" in request.data:
            user.is_active = bool(request.data["is_active"])
        if "admin_role" in request.data:
            user.admin_role = request.data["admin_role"]
        if "is_phone_verified" in request.data:
            user.is_phone_verified = bool(request.data["is_phone_verified"])
        if "is_email_verified" in request.data:
            user.is_email_verified = bool(request.data["is_email_verified"])
        user.save()
        log_activity(request.user, "user.update", "user", user.id, request.data, request)
        return Response({"ok": True})

    def delete(self, request, pk):
        if str(request.user.id) == str(pk):
            return Response({"detail": "You cannot remove your own account."}, status=400)
        try:
            user = User.objects.get(id=pk)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=404)
        if user.role == User.Role.ADMIN or user.is_staff:
            return Response({"detail": "Admin accounts cannot be removed from here."}, status=400)
        active_statuses = ["pending", "confirmed", "packed", "out_for_delivery"]
        if Order.objects.filter(user=user, status__in=active_statuses).exists():
            return Response(
                {"detail": "This user has active orders. Cancel or complete them first."},
                status=400,
            )
        log_activity(request.user, "user.delete", "user", user.id, request=request)
        user.is_active = False
        user.email = f"deleted_{user.id}@deleted.local"
        user.phone = None
        user.full_name = "Deleted User"
        user.first_name = ""
        user.last_name = ""
        user.save()
        return Response(status=204)


class AdminPincodeView(APIView):
    permission_classes = [AdminModulePermission]
    admin_module = "settings"

    def get(self, request):
        rows = ServiceablePincode.objects.order_by("pincode")
        return Response([{"pincode": r.pincode, "city": r.city, "is_active": r.is_active} for r in rows])

    def post(self, request):
        pincode = request.data.get("pincode", "").strip()
        ServiceablePincode.objects.update_or_create(
            pincode=pincode,
            defaults={"city": request.data.get("city", ""), "is_active": request.data.get("is_active", True)},
        )
        return Response({"ok": True})

    def delete(self, request):
        ServiceablePincode.objects.filter(pincode=request.data.get("pincode")).delete()
        return Response(status=204)


class AdminRiderView(APIView):
    permission_classes = [AdminModulePermission]
    admin_module = "delivery"

    def get(self, request):
        riders = DeliveryRider.objects.annotate(active_orders=Count("deliveryassignment")).order_by("name")
        return Response([{
            "id": str(r.id),
            "name": r.name,
            "phone": r.phone,
            "vehicle": r.vehicle,
            "is_active": r.is_active,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "total_deliveries": r.total_deliveries,
            "rating": r.rating,
            "active_orders": r.active_orders,
        } for r in riders])

    def post(self, request):
        data = request.data
        rid = data.get("id")
        fields = {k: data[k] for k in ("name", "phone", "vehicle", "is_active", "latitude", "longitude") if k in data}
        if rid:
            DeliveryRider.objects.filter(id=rid).update(**fields)
        else:
            DeliveryRider.objects.create(**fields)
        return Response({"ok": True})


class AdminDeliveryAssignView(APIView):
    permission_classes = [AdminModulePermission]
    admin_module = "delivery"

    def post(self, request):
        order = Order.objects.get(id=request.data.get("order_id"))
        rider = DeliveryRider.objects.get(id=request.data.get("rider_id"))
        assignment, _ = DeliveryAssignment.objects.update_or_create(
            order=order,
            defaults={
                "rider": rider,
                "status": DeliveryAssignment.Status.ASSIGNED,
                "earnings": Decimal(str(request.data.get("earnings", 40))),
            },
        )
        log_activity(request.user, "delivery.assign", "order", order.id, {"rider_id": str(rider.id)}, request)
        return Response({"id": str(assignment.id), "ok": True})

    def patch(self, request):
        assignment = DeliveryAssignment.objects.select_related("order", "rider").get(id=request.data.get("id"))
        if "status" in request.data:
            assignment.status = request.data["status"]
            if assignment.status == DeliveryAssignment.Status.DELIVERED:
                assignment.delivered_at = timezone.now()
                assignment.order.status = Order.Status.DELIVERED
                assignment.order.save(update_fields=["status"])
                assignment.rider.total_deliveries += 1
                assignment.rider.save(update_fields=["total_deliveries"])
                notify_order_status(assignment.order)
        if "latitude" in request.data and assignment.rider_id:
            assignment.rider.latitude = request.data["latitude"]
            assignment.rider.longitude = request.data.get("longitude")
            assignment.rider.save(update_fields=["latitude", "longitude"])
        assignment.save()
        return Response({"ok": True})


class AdminPaymentReportView(APIView):
    permission_classes = [AdminModulePermission]
    admin_module = "payments"

    def get(self, request):
        payments = Payment.objects.select_related("order", "user").order_by("-created_at")[:200]
        by_method = Payment.objects.filter(status="success").values("method").annotate(
            total=Sum("amount"), count=Count("id")
        )
        failed = Payment.objects.filter(status="failed").count()
        return Response({
            "payments": [{
                "id": str(p.id),
                "order_number": p.order.order_number,
                "method": p.method,
                "amount": float(p.amount),
                "status": p.status,
                "gateway": p.gateway,
                "created_at": p.created_at.isoformat(),
            } for p in payments],
            "summary": {
                "by_method": list(by_method),
                "failed_count": failed,
            },
        })


class AdminRefundView(APIView):
    permission_classes = [AdminModulePermission]
    admin_module = "payments"

    def post(self, request):
        ret = OrderReturn.objects.select_related("order").get(id=request.data.get("return_id"))
        amount = Decimal(str(request.data.get("amount", ret.order.total)))
        method = request.data.get("method", "wallet")
        refund = process_refund(ret.order, amount, ret, method)
        ret.status = OrderReturn.Status.REFUNDED
        ret.save(update_fields=["status"])
        log_activity(request.user, "refund.process", "return", ret.id, {"amount": str(amount)}, request)
        return Response({"id": str(refund.id), "ok": True})


class AdminBOGOView(APIView):
    permission_classes = [AdminModulePermission]
    admin_module = "coupons"

    def get(self, request):
        rows = BOGOPromotion.objects.select_related("buy_product", "get_product").order_by("-created_at")
        return Response([{
            "id": str(b.id),
            "name": b.name,
            "buy_product_id": str(b.buy_product_id),
            "buy_product_name": b.buy_product.name,
            "get_product_id": str(b.get_product_id),
            "get_product_name": b.get_product.name,
            "get_quantity": b.get_quantity,
            "is_active": b.is_active,
        } for b in rows])

    def post(self, request):
        data = request.data
        bid = data.get("id")
        fields = {
            "name": data.get("name", ""),
            "buy_product_id": data.get("buy_product_id"),
            "get_product_id": data.get("get_product_id"),
            "get_quantity": int(data.get("get_quantity", 1)),
            "is_active": data.get("is_active", True),
        }
        if bid:
            BOGOPromotion.objects.filter(id=bid).update(**fields)
        else:
            BOGOPromotion.objects.create(**fields)
        return Response({"ok": True})


class AdminCategoryDiscountView(APIView):
    permission_classes = [AdminModulePermission]
    admin_module = "coupons"

    def get(self, request):
        rows = CategoryDiscount.objects.select_related("category").order_by("-created_at")
        return Response([{
            "id": str(d.id),
            "category_id": str(d.category_id),
            "category_name": d.category.name,
            "discount_percent": float(d.discount_percent),
            "is_active": d.is_active,
        } for d in rows])

    def post(self, request):
        data = request.data
        did = data.get("id")
        fields = {
            "category_id": data.get("category_id"),
            "discount_percent": data.get("discount_percent", 0),
            "is_active": data.get("is_active", True),
        }
        if did:
            CategoryDiscount.objects.filter(id=did).update(**fields)
        else:
            CategoryDiscount.objects.create(**fields)
        return Response({"ok": True})


class AdminDeliveryPerformanceView(APIView):
    permission_classes = [AdminModulePermission]
    admin_module = "delivery"

    def get(self, request):
        stats = []
        for r in DeliveryRider.objects.all():
            assignments = DeliveryAssignment.objects.filter(rider=r)
            completed = assignments.filter(status=DeliveryAssignment.Status.DELIVERED).count()
            stats.append({
                "rider": r.name,
                "total_deliveries": r.total_deliveries,
                "assigned": assignments.count(),
                "completed": completed,
                "rating": r.rating,
                "earnings": float(assignments.aggregate(s=Sum("earnings"))["s"] or 0),
            })
        delivered = DeliveryAssignment.objects.filter(status=DeliveryAssignment.Status.DELIVERED).count()
        return Response({"riders": stats, "delivered_count": delivered})
