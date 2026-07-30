import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { PageShell, TopBar } from "@/components/page-shell";
import { Reveal } from "@/components/motion";
import { BLOG_POSTS } from "@/lib/content";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/blogs/")({
  head: () => ({
    meta: [
      { title: "Kitchen & Pooja Journal — Sri Mahalakshmi Stores" },
      {
        name: "description",
        content: "Practical guides on daily pooja rituals, cooking oils, storing staples and running an Indian kitchen.",
      },
      { property: "og:title", content: "Kitchen & Pooja Journal" },
      { property: "og:description", content: "Guides on rituals, staples and everyday Indian cooking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BlogsPage,
});

function BlogsPage() {
  return (
    <PageShell>
      <TopBar title="Journal" subtitle="Kitchen & pooja guides" backTo="/" />
      <div className="space-y-3 p-4">
        {BLOG_POSTS.map((post, i) => (
          <Reveal key={post.slug} delay={i * 0.05}>
            <Link
              to="/blogs/$slug"
              params={{ slug: post.slug }}
              className="block rounded-2xl border border-border bg-card p-4 card-elevated"
            >
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
                {post.tag}
              </span>
              <h2 className="mt-2.5 text-sm font-bold leading-snug text-foreground">{post.title}</h2>
              <p className="mt-1.5 text-xs text-muted-foreground">{post.excerpt}</p>
              <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span>{post.author}</span>
                <span>·</span>
                <span>{formatDate(post.date)}</span>
                <span className="ml-auto flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {post.readMinutes} min
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </PageShell>
  );
}
