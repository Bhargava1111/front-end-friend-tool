"""Production health check — database, Redis, Celery."""

from __future__ import annotations

from django.conf import settings
from django.db import connection
from django.http import JsonResponse


def _check_database() -> str:
    try:
        connection.ensure_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return "ok"
    except Exception:
        return "error"


def _check_redis() -> str:
    broker = getattr(settings, "CELERY_BROKER_URL", "") or getattr(settings, "REDIS_URL", "")
    if not broker:
        return "skipped"
    try:
        import redis

        client = redis.from_url(broker, socket_connect_timeout=2)
        client.ping()
        return "ok"
    except Exception:
        return "error"


def _check_celery() -> str:
    if getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False):
        return "eager"
    try:
        from config.celery import app

        replies = app.control.ping(timeout=2.0)
        return "ok" if replies else "error"
    except Exception:
        return "error"


def health_view(_request):
    services = {
        "database": _check_database(),
        "redis": _check_redis(),
        "celery": _check_celery(),
        "gunicorn": "ok",
        "nginx": "ok",
    }

    critical = ("database",)
    failed = [name for name in critical if services[name] == "error"]
    status = "ok" if not failed else "degraded"
    http_status = 200 if status == "ok" else 503

    return JsonResponse(
        {
            "status": status,
            "services": services,
        },
        status=http_status,
    )
