from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from catalog.cache_utils import invalidate_catalog_cache
from catalog.models import Banner, HomeOfferSection, Product, ProductOfferPlacement


@receiver(post_save, sender=Product)
@receiver(post_delete, sender=Product)
@receiver(post_save, sender=Banner)
@receiver(post_delete, sender=Banner)
@receiver(post_save, sender=ProductOfferPlacement)
@receiver(post_delete, sender=ProductOfferPlacement)
@receiver(post_save, sender=HomeOfferSection)
@receiver(post_delete, sender=HomeOfferSection)
def _invalidate_catalog_cache(**kwargs):
    invalidate_catalog_cache()
