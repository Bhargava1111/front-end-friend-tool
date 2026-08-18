from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAuthenticatedUser
from notifications.models import Notification


class NotificationListView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        qs = Notification.objects.filter(user=request.user).order_by("-created_at")
        if request.query_params.get("unread") == "true":
            qs = qs.filter(is_read=False)
        return Response([
            {
                "id": n.id,
                "title": n.title,
                "body": n.body,
                "image_url": n.image_url or None,
                "type": n.type,
                "order_id": str(n.order_id) if n.order_id else None,
                "link": n.link or None,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat(),
            }
            for n in qs[:50]
        ])


class NotificationReadView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def post(self, request, pk):
        Notification.objects.filter(id=pk, user=request.user).update(is_read=True)
        return Response({"ok": True})


class NotificationReadAllView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"ok": True})


class NotificationDeleteView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def delete(self, request, pk):
        Notification.objects.filter(id=pk, user=request.user).delete()
        return Response(status=204)
