"""PostgreSQL-first database configuration for Django."""

from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import unquote, urlparse

from django.core.exceptions import ImproperlyConfigured


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.lower() in ("1", "true", "yes", "on")


def _postgres_options() -> dict:
    options: dict = {}
    pg_opts: dict = {}

    sslmode = os.getenv("POSTGRES_SSLMODE", "").strip()
    if sslmode:
        pg_opts["sslmode"] = sslmode

    connect_timeout = os.getenv("POSTGRES_CONNECT_TIMEOUT", "").strip()
    if connect_timeout:
        pg_opts["connect_timeout"] = int(connect_timeout)

    if pg_opts:
        options["OPTIONS"] = pg_opts

    conn_max_age = os.getenv("DB_CONN_MAX_AGE")
    if conn_max_age is not None and conn_max_age != "":
        options["CONN_MAX_AGE"] = int(conn_max_age)
    elif not _env_bool("DEBUG", True):
        options["CONN_MAX_AGE"] = 600

    options["CONN_HEALTH_CHECKS"] = True

    if _env_bool("DB_ATOMIC_REQUESTS"):
        options["ATOMIC_REQUESTS"] = True

    return options


def _postgres_from_url(database_url: str) -> dict:
    parsed = urlparse(database_url)
    if parsed.scheme not in ("postgres", "postgresql"):
        raise ImproperlyConfigured(f"Unsupported DATABASE_URL scheme: {parsed.scheme}")

    name = (parsed.path or "").lstrip("/")
    if not name:
        raise ImproperlyConfigured("DATABASE_URL is missing the database name.")

    config = {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": name,
        "USER": unquote(parsed.username or ""),
        "PASSWORD": unquote(parsed.password or ""),
        "HOST": parsed.hostname or "localhost",
        "PORT": str(parsed.port or 5432),
    }
    config.update(_postgres_options())
    return config


def _postgres_from_env() -> dict | None:
    name = os.getenv("POSTGRES_DB") or os.getenv("DB_NAME")
    if not name:
        return None

    config = {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": name,
        "USER": os.getenv("POSTGRES_USER", os.getenv("DB_USER", "postgres")),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", os.getenv("DB_PASSWORD", "")),
        "HOST": os.getenv("POSTGRES_HOST", os.getenv("DB_HOST", "localhost")),
        "PORT": os.getenv("POSTGRES_PORT", os.getenv("DB_PORT", "5432")),
    }
    config.update(_postgres_options())
    return config


def build_databases(base_dir: Path) -> dict:
    """
    Resolve Django DATABASES.

    Priority:
    1. DATABASE_URL (postgresql://…)
    2. POSTGRES_DB / DB_NAME + related vars
    3. SQLite only when DEBUG=True and USE_SQLITE is not disabled

    Production (DEBUG=False) requires PostgreSQL.
    """
    database_url = os.getenv("DATABASE_URL", "").strip()
    debug = _env_bool("DEBUG", True)

    if database_url:
        if database_url.startswith("sqlite"):
            return {
                "default": {
                    "ENGINE": "django.db.backends.sqlite3",
                    "NAME": base_dir / "db.sqlite3",
                }
            }
        return {"default": _postgres_from_url(database_url)}

    postgres = _postgres_from_env()
    if postgres:
        return {"default": postgres}

    use_sqlite = _env_bool("USE_SQLITE", debug)
    if use_sqlite and debug:
        return {
            "default": {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": base_dir / "db.sqlite3",
            }
        }

    raise ImproperlyConfigured(
        "PostgreSQL is required. Set DATABASE_URL or POSTGRES_DB/POSTGRES_USER/"
        "POSTGRES_PASSWORD/POSTGRES_HOST. For local dev: docker compose up -d db "
        "and copy DATABASE_URL from backend/.env.example."
    )
