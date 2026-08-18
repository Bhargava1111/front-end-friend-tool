from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminRole
from blog.models import BlogPost


class BlogListView(APIView):
    def get(self, request):
        qs = BlogPost.objects.filter(is_published=True).order_by("-published_at", "-created_at")
        return Response([
            {
                "id": p.id,
                "title": p.title,
                "slug": p.slug,
                "excerpt": p.excerpt,
                "cover_url": p.cover_url,
                "author": p.author,
                "tags": p.tags,
                "read_minutes": p.read_minutes,
                "published_at": p.published_at.isoformat() if p.published_at else None,
            }
            for p in qs
        ])


class BlogDetailView(APIView):
    def get(self, request, slug):
        post = BlogPost.objects.filter(slug=slug, is_published=True).first()
        if not post:
            return Response({"detail": "Not found."}, status=404)
        related = BlogPost.objects.filter(is_published=True).exclude(id=post.id)[:2]
        return Response({
            "id": post.id,
            "title": post.title,
            "slug": post.slug,
            "excerpt": post.excerpt,
            "body": post.body,
            "cover_url": post.cover_url,
            "author": post.author,
            "tags": post.tags,
            "read_minutes": post.read_minutes,
            "published_at": post.published_at.isoformat() if post.published_at else None,
            "related": [{"title": r.title, "slug": r.slug, "excerpt": r.excerpt} for r in related],
        })


class AdminBlogView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        qs = BlogPost.objects.all().order_by("-created_at")
        return Response([{"id": p.id, "title": p.title, "slug": p.slug, "is_published": p.is_published} for p in qs])

    def post(self, request):
        slug = request.data.get("slug")
        post, _ = BlogPost.objects.update_or_create(
            slug=slug,
            defaults={
                "title": request.data.get("title", ""),
                "excerpt": request.data.get("excerpt", ""),
                "body": request.data.get("body", ""),
                "cover_url": request.data.get("cover_url", ""),
                "author": request.data.get("author", ""),
                "tags": request.data.get("tags", []),
                "read_minutes": request.data.get("read_minutes", 5),
                "is_published": request.data.get("is_published", False),
            },
        )
        return Response({"id": post.id}, status=201)
