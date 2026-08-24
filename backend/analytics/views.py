from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from analytics.models import JourneyEvent
from analytics.services import (
    analytics_session_id,
    record_journey,
    record_product_view,
    record_search,
)
from catalog.models import Product


class TrackSearchView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        session_id = analytics_session_id(request, request.data)
        query = (request.data.get("query") or request.data.get("q") or "").strip()
        if not session_id or len(query) < 2:
            return Response({"ok": False, "detail": "session_id and query are required."}, status=400)
        event = record_search(
            request=request,
            query=query,
            results_count=request.data.get("results_count") or request.data.get("resultsCount") or 0,
            filters=request.data.get("filters") if isinstance(request.data.get("filters"), dict) else {},
            session_id=session_id,
        )
        return Response({"ok": True, "id": str(event.id)}, status=201)


class TrackProductViewView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        session_id = analytics_session_id(request, request.data)
        product_id = request.data.get("product_id") or request.data.get("productId")
        if not session_id or not product_id:
            return Response({"ok": False, "detail": "session_id and product_id are required."}, status=400)
        product = Product.objects.select_related("category").filter(id=product_id).first()
        if not product:
            return Response({"ok": False, "detail": "Product not found."}, status=404)
        event, created = record_product_view(
            request=request,
            product=product,
            session_id=session_id,
            search_id=request.data.get("search_id") or request.data.get("searchId"),
            source=request.data.get("source") or "",
            referrer=request.data.get("referrer") or request.data.get("page") or "",
        )
        return Response({"ok": True, "id": str(event.id), "recorded": created}, status=201 if created else 200)


class TrackJourneyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        session_id = analytics_session_id(request, request.data)
        event_type = (request.data.get("event_type") or request.data.get("type") or "").strip()
        if not session_id or event_type not in JourneyEvent.EventType.values:
            return Response({"ok": False, "detail": "session_id and a valid event_type are required."}, status=400)
        product = None
        product_id = request.data.get("product_id") or request.data.get("productId")
        if product_id:
            product = Product.objects.filter(id=product_id).first()
        event = record_journey(
            request=request,
            event_type=event_type,
            session_id=session_id,
            search_id=request.data.get("search_id") or request.data.get("searchId"),
            product=product,
            metadata={k: request.data.get(k) for k in ("page", "source") if request.data.get(k)},
        )
        return Response({"ok": True, "id": str(event.id)}, status=201)
