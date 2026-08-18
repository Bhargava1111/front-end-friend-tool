import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { getAdminBlogPosts, deleteAdminBlogPost } from "@/lib/admin-ops.functions";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/blog/")({
  head: () => ({
    meta: [
      { title: "Blog Manager — Admin | Sri Mahalakshmi Stores" },
      { name: "description", content: "Write, publish and edit the kitchen and pooja journal." },
      { property: "og:title", content: "Blog Manager — Admin" },
      { property: "og:description", content: "Publish articles for the storefront journal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminBlog,
});

function AdminBlog() {
  const qc = useQueryClient();
  const fetchPosts = useServerFn(getAdminBlogPosts);
  const remove = useServerFn(deleteAdminBlogPost);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-blog"],
    queryFn: () => fetchPosts(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Article deleted");
      qc.invalidateQueries({ queryKey: ["admin-blog"] });
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-foreground">Journal</h1>
          <p className="text-xs text-muted-foreground">{data.length} articles</p>
        </div>
        <Button className="shrink-0 gap-2" asChild>
          <Link to="/admin/blog/new">
            <Plus className="h-4 w-4" /> New article
          </Link>
        </Button>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-2xl bg-card" />}

      {!isLoading && data.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No articles yet — publish your first guide.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {data.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{p.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">/blogs/{p.slug}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.excerpt}</p>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {p.is_published ? "Published" : "Draft"} · {formatDate(p.created_at)}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Link
                  to="/admin/blog/$id"
                  params={{ id: p.id }}
                  aria-label="Edit article"
                  className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
                <button
                  type="button"
                  aria-label="Delete article"
                  onClick={() => {
                    if (confirm("Delete this article?")) deleteMutation.mutate(p.id);
                  }}
                  className="grid h-9 w-9 place-items-center rounded-lg bg-destructive/10 text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
