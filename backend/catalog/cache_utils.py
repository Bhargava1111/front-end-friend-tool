from django.core.cache import cache

HOME_CACHE_KEY = "catalog:home:v1"
HOME_CACHE_TTL = 60
DEALS_CACHE_PREFIX = "catalog:deals:"
DEALS_CACHE_TTL = 45
SECTIONS_CACHE_KEY = "catalog:home_sections:v1"
SECTIONS_CACHE_TTL = 120


def invalidate_catalog_cache():
    cache.delete(HOME_CACHE_KEY)
    cache.delete(SECTIONS_CACHE_KEY)
    try:
        cache.delete_pattern(f"{DEALS_CACHE_PREFIX}*")
    except AttributeError:
        pass
