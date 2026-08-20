import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminFn } from "@/hooks/use-admin-fn";
import { getAdminBlogPostsClient, saveAdminBlogPostClient } from "@/lib/admin-client.functions";
import { toast } from "sonner";
import { getAdminBlogPosts, saveAdminBlogPost } from "@/lib/admin-ops.functions";
import { AdminFormShell } from "@/components/admin-form-shell";
import { ImageUploadField } from "@/components/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin/blog/$id")({
  component: EditBlogPost,
});

type Draft = {
  id: string;
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

function EditBlogPost() {
  const { id } = useParams({ from: "/admin/blog/$id" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchPosts = useAdminFn(getAdminBlogPosts, getAdminBlogPostsClient);
  const save = useAdminFn(saveAdminBlogPost, saveAdminBlogPostClient);
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-blog"],
    queryFn: () => fetchPosts(),
  });

  const post = data.find((p) => p.id === id);

  useEffect(() => {
    if (post) {
      setDraft({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt ?? "",
        body: post.body ?? "",
        cover_url: post.cover_url,
        author: post.author ?? "",
        tags: (post.tags ?? []).join(", "),
        read_minutes: post.read_minutes ?? 4,
        is_published: post.is_published,
      });
    }
  }, [post]);

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
      qc.invalidateQueries({ queryKey: ["admin-blog"] });
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
      navigate({ to: "/admin/blog" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !draft) {
    return <div className="h-56 animate-pulse rounded-2xl bg-card" />;
  }

  if (!post) {
    return (
      <AdminFormShell backTo="/admin/blog" backLabel="Back to journal" title="Article not found">
        <p className="text-sm text-muted-foreground">This article does not exist.</p>
      </AdminFormShell>
    );
  }

  return (
    <AdminFormShell backTo="/admin/blog" backLabel="Back to journal" title="Edit article">
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
        <ImageUploadField
          label="Cover image"
          folder="misc"
          value={draft.cover_url ?? ""}
          onChange={(url: string) => setDraft({ ...draft, cover_url: url || null })}
        />
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
    </AdminFormShell>
  );
}
