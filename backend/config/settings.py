import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

from config.database import build_databases

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-only-change-me-in-production")
DEBUG = os.getenv("DEBUG", "True").lower() in ("1", "true", "yes")
ALLOWED_HOSTS = [h.strip() for h in os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h.strip()]
if DEBUG:
    ALLOWED_HOSTS = ["*"]
_render_host = os.getenv("RENDER_EXTERNAL_HOSTNAME", "").strip()
if _render_host and _render_host not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(_render_host)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    "accounts",
    "catalog",
    "orders",
    "locations",
    "notifications",
    "blog",
    "storeops",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

DATABASES = build_databases(BASE_DIR)

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
MEDIA_PUBLIC_BASE_URL = os.getenv("MEDIA_PUBLIC_BASE_URL", "").rstrip("/")
PUBLIC_API_URL = os.getenv("PUBLIC_API_URL", "").rstrip("/")
if not PUBLIC_API_URL and _render_host:
    PUBLIC_API_URL = f"https://{_render_host}"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:8080,http://127.0.0.1:8080").split(",")
    if o.strip()
]
for _origin in (
    "http://localhost",
    "https://localhost",
    "http://localhost:8080",
    "https://localhost:8080",
    "capacitor://localhost",
    "ionic://localhost",
):
    if _origin not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS.append(_origin)
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https?://localhost(:\d+)?$",
    r"^https?://127\.0\.0\.1(:\d+)?$",
    r"^capacitor://localhost$",
    r"^ionic://localhost$",
    r"^https?://192\.168\.\d+\.\d+(:\d+)?$",
    r"^https?://10\.\d+\.\d+\.\d+(:\d+)?$",
]
CORS_ALLOW_CREDENTIALS = True
if DEBUG and os.getenv("CORS_ALLOW_ALL_ORIGINS", "True").lower() in ("1", "true", "yes"):
    CORS_ALLOW_ALL_ORIGINS = True

CSRF_TRUSTED_ORIGINS = [
    o.strip()
    for o in os.getenv("CSRF_TRUSTED_ORIGINS", "").split(",")
    if o.strip()
]

# Production security (when DEBUG=False)
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "False").lower() in ("1", "true", "yes")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    X_FRAME_OPTIONS = "DENY"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.AllowAny",),
    "DEFAULT_FILTER_BACKENDS": ("django_filters.rest_framework.DjangoFilterBackend",),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DATETIME_FORMAT": "%Y-%m-%dT%H:%M:%S.%fZ",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=12),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,
}

# OTP settings
OTP_TTL_SECONDS = int(os.getenv("OTP_TTL_SECONDS", "300"))
OTP_MAX_ATTEMPTS = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))
OTP_RESEND_COOLDOWN = int(os.getenv("OTP_RESEND_COOLDOWN", "30"))
ENABLE_DEMO_OTP = os.getenv("ENABLE_DEMO_OTP", "True").lower() in ("1", "true", "yes")
DEMO_OTP_CODE = "123456"
PHONE_EMAIL_DOMAIN = "phone.mnxstore.in"

# Admin panel step-up security (OTP + idle logout)
ADMIN_PANEL_IDLE_SECONDS = int(os.getenv("ADMIN_PANEL_IDLE_SECONDS", "600"))

# Web push (browser / PWA notifications)
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_SUBJECT = os.getenv("VAPID_SUBJECT", "mailto:care@srimahalakshmistores.in")

# App settings defaults
DEFAULT_DELIVERY_FEE = 40
DEFAULT_FREE_DELIVERY_ABOVE = 499
DEFAULT_TAX_RATE = 0

EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() in ("1", "true", "yes")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "care@srimahalakshmistores.in")

# Redis / Celery (background tasks: OTP, email, SMS, push notifications)
REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0").strip()
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", REDIS_URL).strip()
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", REDIS_URL).strip()

# Cache (Redis db 1 when available — Celery uses db 0 by default)
_cache_redis = os.getenv("CACHE_REDIS_URL", "").strip()
if not _cache_redis and REDIS_URL:
    _cache_redis = REDIS_URL.replace("/0", "/1") if REDIS_URL.endswith("/0") else f"{REDIS_URL}/1"
if _cache_redis:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": _cache_redis,
            "KEY_PREFIX": "mnx",
            "TIMEOUT": 60,
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "mnx-local",
            "TIMEOUT": 60,
        }
    }
CELERY_TASK_ALWAYS_EAGER = os.getenv(
    "CELERY_TASK_ALWAYS_EAGER",
    "True" if DEBUG else "False",
).lower() in ("1", "true", "yes")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_WORKER_PREFETCH_MULTIPLIER = int(os.getenv("CELERY_WORKER_PREFETCH_MULTIPLIER", "4"))
