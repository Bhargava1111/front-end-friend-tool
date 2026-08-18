import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "@/lib/api";

export type BlogPostRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  cover_url: string | null;
  author: string | null;
  tags: string[] | null;
  read_minutes: number | null;
  published_at: string | null;
  created_at?: string;
};

export const listBlogPosts = createServerFn({ method: "GET" }).handler(async () => {
  return apiFetch<BlogPostRow[]>("/blog/");
});

export const getBlogPost = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    try {
      const post = await apiFetch<BlogPostRow & { related?: { title: string; slug: string; excerpt: string }[] }>(
        `/blog/${data.slug}/`,
      );
      return { post, others: post.related ?? [] };
    } catch {
      return null;
    }
  });
