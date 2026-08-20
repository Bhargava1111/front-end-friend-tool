import { apiFetch } from "@/lib/api";
import { readOfflineCache, writeOfflineCache } from "@/lib/offline-cache";

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

function normalizePosts(rows: BlogPostRow[] | { results?: BlogPostRow[] } | null | undefined) {
  const list = Array.isArray(rows) ? rows : (rows?.results ?? []);
  return list.map((post) => ({
    ...post,
    tags: Array.isArray(post.tags) ? post.tags : post.tags ? [String(post.tags)] : [],
  }));
}

export async function listBlogPosts() {
  try {
    const rows = await apiFetch<BlogPostRow[] | { results?: BlogPostRow[] }>("/blog/");
    const posts = normalizePosts(rows);
    writeOfflineCache("blog-posts", posts);
    return posts;
  } catch (error) {
    const cached = readOfflineCache<BlogPostRow[]>("blog-posts");
    if (cached) return cached;
    throw error;
  }
}

export async function getBlogPost({ data }: { data: { slug: string } }) {
  try {
    const post = await apiFetch<BlogPostRow & { related?: { title: string; slug: string; excerpt: string }[] }>(
      `/blog/${data.slug}/`,
    );
    return { post, others: post.related ?? [] };
  } catch {
    return null;
  }
}
