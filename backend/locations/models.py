import uuid

from django.db import models


class StoreLocation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    address_text = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=6)
    latitude = models.FloatField()
    longitude = models.FloatField()
    phone = models.CharField(max_length=15, blank=True, default="")
    opening_hours = models.CharField(max_length=255, blank=True, default="")
    delivery_radius_km = models.DecimalField(max_digits=6, decimal_places=2, default=10)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
