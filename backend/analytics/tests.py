import uuid

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.admin_session import create_admin_panel_session
from analytics.models import JourneyEvent, ProductViewEvent, SearchEvent
from catalog.models import Product

User = get_user_model()


@override_settings(
    ANALYTICS_VIEW_DEDUP_SECONDS=1800,
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
)
class AnalyticsTrackingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.session = str(uuid.uuid4())
        self.product = Product.objects.create(
            name="Nike Air Max",
            slug=f"nike-air-max-{uuid.uuid4().hex[:8]}",
            price=1999,
            stock=10,
        )
        self.customer = User.objects.create_user(
            email="shopper@example.com",
            password="pass12345",
            role="customer",
        )
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="pass12345",
            role="admin",
            is_staff=True,
        )

    def _auth(self, user):
        token = str(RefreshToken.for_user(user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        return token

    def _admin(self):
        self._auth(self.admin)
        panel, _session = create_admin_panel_session(self.admin)
        self.client.credentials(
            HTTP_AUTHORIZATION=self.client._credentials.get("HTTP_AUTHORIZATION", ""),
            HTTP_X_ADMIN_SESSION=panel,
        )
        token = str(RefreshToken.for_user(self.admin).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}", HTTP_X_ADMIN_SESSION=panel)

    def test_guest_search_is_recorded(self):
        res = self.client.post(
            "/api/v1/analytics/search/",
            {
                "session_id": self.session,
                "query": "red running shoes",
                "results_count": 12,
                "filters": {"sort": "relevance"},
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        event = SearchEvent.objects.get()
        self.assertEqual(event.query, "red running shoes")
        self.assertEqual(event.results_count, 12)
        self.assertIsNone(event.user_id)
        self.assertEqual(event.session_id, self.session)

    def test_logged_in_search_stores_user(self):
        self._auth(self.customer)
        res = self.client.post(
            "/api/v1/analytics/search/",
            {"session_id": self.session, "query": "nike shoes", "results_count": 4},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(SearchEvent.objects.get().user_id, self.customer.id)

    def test_product_view_dedupes_within_window(self):
        payload = {
            "session_id": self.session,
            "product_id": str(self.product.id),
            "source": "search",
        }
        first = self.client.post("/api/v1/analytics/view/", payload, format="json")
        second = self.client.post("/api/v1/analytics/view/", payload, format="json")
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(ProductViewEvent.objects.count(), 1)
        self.assertFalse(second.data["recorded"])

    def test_search_click_and_view_are_linked(self):
        search = self.client.post(
            "/api/v1/analytics/search/",
            {"session_id": self.session, "query": "running shoes", "results_count": 3},
            format="json",
        )
        search_id = search.data["id"]
        self.client.post(
            "/api/v1/analytics/journey/",
            {
                "session_id": self.session,
                "event_type": "click",
                "search_id": search_id,
                "product_id": str(self.product.id),
            },
            format="json",
        )
        self.client.post(
            "/api/v1/analytics/view/",
            {
                "session_id": self.session,
                "product_id": str(self.product.id),
                "search_id": search_id,
                "source": "search",
            },
            format="json",
        )
        view = ProductViewEvent.objects.get()
        self.assertEqual(str(view.search_id), search_id)
        self.assertEqual(JourneyEvent.objects.filter(event_type="click").count(), 1)

    def test_customer_cannot_read_admin_analytics(self):
        self._auth(self.customer)
        res = self.client.get("/api/v1/admin-api/analytics/searches/")
        self.assertIn(res.status_code, (401, 403))

    def test_admin_search_kpis_and_zero_results(self):
        SearchEvent.objects.create(
            session_id=self.session,
            query="iphone 17 pro max",
            query_normalized="iphone 17 pro max",
            results_count=0,
        )
        SearchEvent.objects.create(
            session_id=self.session,
            query="Nike shoes",
            query_normalized="nike shoes",
            results_count=52,
        )
        self._admin()
        res = self.client.get("/api/v1/admin-api/analytics/searches/?preset=30d")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["kpis"]["total_searches"], 2)
        self.assertEqual(res.data["kpis"]["zero_result_searches"], 1)
        zeros = self.client.get("/api/v1/admin-api/analytics/searches/zero-results/")
        self.assertEqual(zeros.status_code, 200)
        self.assertEqual(zeros.data["rows"][0]["query"], "iphone 17 pro max")

    def test_admin_product_and_funnel_endpoints(self):
        search = SearchEvent.objects.create(
            session_id=self.session,
            query="running shoes",
            query_normalized="running shoes",
            results_count=5,
        )
        ProductViewEvent.objects.create(
            session_id=self.session,
            product=self.product,
            product_name=self.product.name,
            search=search,
        )
        JourneyEvent.objects.create(
            session_id=self.session,
            event_type=JourneyEvent.EventType.ADD_TO_CART,
            product=self.product,
            search=search,
        )
        JourneyEvent.objects.create(
            session_id=self.session,
            event_type=JourneyEvent.EventType.PURCHASE,
            product=self.product,
            search=search,
        )
        self._admin()
        products = self.client.get("/api/v1/admin-api/analytics/products/")
        self.assertEqual(products.status_code, 200)
        self.assertEqual(products.data["rows"][0]["views"], 1)
        detail = self.client.get(f"/api/v1/admin-api/analytics/products/{self.product.id}/")
        self.assertEqual(detail.status_code, 200)
        self.assertGreater(detail.data["conversion_rate"], 0)
        funnel = self.client.get("/api/v1/admin-api/analytics/behavior/")
        self.assertEqual(funnel.status_code, 200)
        self.assertEqual(funnel.data["stages"][0]["count"], 1)
        query = self.client.get("/api/v1/admin-api/analytics/searches/query/?query=running%20shoes")
        self.assertEqual(query.status_code, 200)
        self.assertEqual(query.data["top_viewed_products"][0]["views"], 1)
        activity = self.client.get("/api/v1/admin-api/analytics/activity/")
        self.assertEqual(activity.status_code, 200)
        self.assertFalse(any("@" in (row.get("label") or "") for row in activity.data["rows"]))
