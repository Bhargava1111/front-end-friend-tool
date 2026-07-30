import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { Clock, Newspaper } from "lucide-react";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { BLOG_POSTS } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/blogs/$slug")({
  loader: ({ params }) => {
    const post = BLOG_POSTS.find((p) => p.slug === params.slug);
    if (!post) throw notFound();
    return { title: post.title, excerpt: post.excerpt, date: post.date, author: post.author };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Article unavailable" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.title} — Sri Mahalakshmi Stores`;
    return {
      meta: [
        { title },
        { name: "description", content: loaderData.excerpt },
        { property: "og:title", content: loaderData.title },
        { property: "og:description", content: loaderData.excerpt },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: loaderData.title,
            description: loaderData.excerpt,
            datePublished: loaderData.date,
            author: { "@type": "Person", name: loaderData.author },
          }),
        },
      ],
    };
  },
  component: BlogPostPage,
  notFoundComponent: () => (
    <PageShell>
      <TopBar title="Article not found" backTo="/blogs" />
      <EmptyState
        icon={<Newspaper className="h-8 w-8" />}
        title="This article isn't available"
        description="It may have been moved. Browse the rest of the journal instead."
        action={
          <Button asChild className="rounded-xl">
            <Link to="/blogs">Back to journal</Link>
          </Button>
        }
      />
    </PageShell>
  ),
});

function BlogPostPage() {
  const { slug } = Route.useParams();
  const post = BLOG_POSTS.find((p) => p.slug === slug)!;
  const others = BLOG_POSTS.filter((p) => p.slug !== slug).slice(0, 2);

  return (
    <PageShell>
      <TopBar title={post.tag} backTo="/blogs" />
      <article className="p-4">
        <h1 className="text-xl font-bold leading-snug text-foreground">{post.title}</h1>
        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>{post.author}</span>
          <span>·</span>
          <span>{formatDate(post.date)}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {post.readMinutes} min read
          </span>
        </div>
        <div className="mt-5 space-y-4">
          {post.body.map((para) => (
            <p key={para.slice(0, 24)} className="text-sm leading-relaxed text-muted-foreground">
              {para}
            </p>
          ))}
        </div>
      </article>

      <section className="px-4 pb-8">
        <h2 className="mb-2 text-sm font-bold">Read next</h2>
        <div className="space-y-2.5">
          {others.map((p) => (
            <Link
              key={p.slug}
              to="/blogs/$slug"
              params={{ slug: p.slug }}
              className="block rounded-2xl border border-border bg-card p-4 card-elevated"
            >
              <p className="text-sm font-semibold">{p.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{p.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
