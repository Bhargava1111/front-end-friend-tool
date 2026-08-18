import uuid

from django.db import models


class BlogPost(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    excerpt = models.TextField(blank=True, default="")
    body = models.TextField()
    cover_url = models.URLField(blank=True, default="")
    author = models.CharField(max_length=120, blank=True, default="")
    tags = models.JSONField(default=list, blank=True)
    read_minutes = models.IntegerField(default=5)
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
