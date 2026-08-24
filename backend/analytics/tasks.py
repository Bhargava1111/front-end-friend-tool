from celery import shared_task
from django.core.cache import cache


@shared_task
def refresh_analytics_cache():
    """Drop dashboard caches so the next admin request recomputes aggregates."""
    cache.delete_many(["analytics:funnel", "analytics:search-kpis", "analytics:catalog-terms"])
    return True
