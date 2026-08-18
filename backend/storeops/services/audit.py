from storeops.models import UserActivityLog


def log_activity(actor, action: str, resource: str = "", resource_id: str = "", details=None, request=None):
    ip = None
    if request:
        ip = request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip() or request.META.get("REMOTE_ADDR")
    UserActivityLog.objects.create(
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        action=action,
        resource=resource,
        resource_id=str(resource_id) if resource_id else "",
        details=details or {},
        ip_address=ip or None,
    )
