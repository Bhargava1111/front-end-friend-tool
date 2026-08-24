from celery import shared_task

from analytics.services import invalidate_analytics_cache


@shared_task
def refresh_analytics_cache():
    """Drop dashboard caches so the next admin request recomputes aggregates."""
    invalidate_analytics_cache()
    return True
