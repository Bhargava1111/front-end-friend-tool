ADMIN_ROLE_PERMISSIONS = {
    "super_admin": {"*"},
    "operations": {"dashboard", "orders", "returns", "delivery", "customers", "reports", "notifications", "tickets"},
    "inventory": {"dashboard", "products", "categories", "brands", "banners", "reviews", "reports"},
    "store_manager": {"dashboard", "orders", "stores", "delivery", "customers", "settings", "tickets"},
    "finance": {"dashboard", "orders", "returns", "reports", "payments", "settings"},
    "support": {"dashboard", "customers", "returns", "tickets", "notifications", "users"},
    "marketing": {"dashboard", "banners", "coupons", "blog", "notifications", "products"},
}


def user_admin_role(user) -> str:
    if not user or not user.is_authenticated:
        return ""
    role = getattr(user, "admin_role", None) or "super_admin"
    if user.is_superuser:
        return "super_admin"
    return role


def has_module_access(user, module: str) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.role != "admin" and not user.is_staff:
        return False
    perms = ADMIN_ROLE_PERMISSIONS.get(user_admin_role(user), set())
    return "*" in perms or module in perms
