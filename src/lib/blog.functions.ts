import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

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
  created_at: string;
};

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const COLUMNS =
  "id, title, slug, excerpt, body, cover_url, author, tags, read_minutes, published_at, created_at";

export const listBlogPosts = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await publicClient()
    .from("blog_posts")
    .select(COLUMNS)
    .eq("is_published", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(60);
  return (data ?? []) as BlogPostRow[];
});

export const getBlogPost = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const client = publicClient();
    const { data: post } = await client
      .from("blog_posts")
      .select(COLUMNS)
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();
    if (!post) return null;
    const { data: others } = await client
      .from("blog_posts")
      .select("title, slug, excerpt")
      .eq("is_published", true)
      .neq("slug", data.slug)
      .limit(3);
    return { post: post as BlogPostRow, others: others ?? [] };
  });
