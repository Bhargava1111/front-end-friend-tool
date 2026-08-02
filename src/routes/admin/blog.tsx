import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  getAdminBlogPosts,
  saveAdminBlogPost,
  deleteAdminBlogPost,
} from "@/lib/admin-ops.functions";
import { formatDate } from "@/lib/format";
import { ImageUpload } from "@/components/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/blog")({
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

type Draft = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  cover_url: string | null;
  author: string;
  tags: string;
  read_minutes: number;
  is_published: boolean;
};

const EMPTY: Draft = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  cover_url: null,
  author: "Sri Mahalakshmi Stores",
  tags: "",
  read_minutes: 4,
  is_published: true,
};

function AdminBlog() {
  const qc = useQueryClient();
  const fetchPosts = useServerFn(getAdminBlogPosts);
  const save = useServerFn(saveAdminBlogPost);
  const remove = useServerFn(deleteAdminBlogPost);
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-blog"],
    queryFn: () => fetchPosts(),
  });

  const saveMutation = useMutation({
    mutationFn: (d: Draft) =>
      save({
        data: {
          id: d.id,
          title: d.title,
          slug: d.slug || d.title,
          excerpt: d.excerpt,
          body: d.body,
          cover_url: d.cover_url,
          author: d.author,
          tags: d.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          read_minutes: d.read_minutes,
          is_published: d.is_published,
        },
      }),
    onSuccess: () => {
      toast.success("Article saved");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["admin-blog"] });
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
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
        <Button className="shrink-0 gap-2" onClick={() => setDraft(EMPTY)}>
          <Plus className="h-4 w-4" /> New article
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
                <button
                  type="button"
                  aria-label="Edit article"
                  onClick={() =>
                    setDraft({
                      id: p.id,
                      title: p.title,
                      slug: p.slug,
                      excerpt: p.excerpt ?? "",
                      body: p.body ?? "",
                      cover_url: p.cover_url,
                      author: p.author ?? "",
                      tags: (p.tags ?? []).join(", "),
                      read_minutes: p.read_minutes ?? 4,
                      is_published: p.is_published,
                    })
                  }
                  className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
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

      <Dialog open={!!draft} onOpenChange={(v) => !v && setDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit article" : "New article"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate(draft);
              }}
            >
              <div>
                <Label htmlFor="b-title">Title</Label>
                <Input
                  id="b-title"
                  required
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="b-slug">Slug</Label>
                  <Input
                    id="b-slug"
                    placeholder="auto from title"
                    value={draft.slug}
                    onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="b-read">Read minutes</Label>
                  <Input
                    id="b-read"
                    inputMode="numeric"
                    value={draft.read_minutes}
                    onChange={(e) =>
                      setDraft({ ...draft, read_minutes: Math.max(1, Number(e.target.value) || 1) })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="b-excerpt">Excerpt</Label>
                <Textarea
                  id="b-excerpt"
                  rows={2}
                  value={draft.excerpt}
                  onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="b-body">Body (blank line between paragraphs)</Label>
                <Textarea
                  id="b-body"
                  rows={8}
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="b-author">Author</Label>
                  <Input
                    id="b-author"
                    value={draft.author}
                    onChange={(e) => setDraft({ ...draft, author: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="b-tags">Tags (comma separated)</Label>
                  <Input
                    id="b-tags"
                    value={draft.tags}
                    onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Cover image</Label>
                <ImageUpload
                  folder="misc"
                  value={draft.cover_url}
                  onChange={(url) => setDraft({ ...draft, cover_url: url })}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border p-3">
                <Label htmlFor="b-pub">Published</Label>
                <Switch
                  id="b-pub"
                  checked={draft.is_published}
                  onCheckedChange={(v) => setDraft({ ...draft, is_published: v })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : "Save article"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
