import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Clock, Newspaper } from "lucide-react";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { getBlogPost } from "@/lib/blog.functions";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";

const postQuery = (slug: string) =>
  queryOptions({
    queryKey: ["blog-post", slug],
    queryFn: () => getBlogPost({ data: { slug } }),
  });

export const Route = createFileRoute("/blogs/$slug")({
  loader: async ({ context, params }) => {
    const result = await context.queryClient.ensureQueryData(postQuery(params.slug));
    if (!result) throw notFound();
    return {
      title: result.post.title,
      excerpt: result.post.excerpt ?? "",
      date: result.post.published_at ?? result.post.created_at,
      author: result.post.author ?? "Store team",
      cover: result.post.cover_url,
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Article unavailable" }, { name: "robots", content: "noindex" }] };
    }
    const isAbsolute = !!loaderData.cover && loaderData.cover.startsWith("https://");
    return {
      meta: [
        { title: `${loaderData.title} — Sri Mahalakshmi Stores` },
        { name: "description", content: loaderData.excerpt },
        { property: "og:title", content: loaderData.title },
        { property: "og:description", content: loaderData.excerpt },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: isAbsolute ? "summary_large_image" : "summary" },
        ...(isAbsolute
          ? [
              { property: "og:image", content: loaderData.cover! },
              { name: "twitter:image", content: loaderData.cover! },
            ]
          : []),
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
  errorComponent: ({ error }) => (
    <PageShell>
      <TopBar title="Journal" backTo="/blogs" />
      <EmptyState
        icon={<Newspaper className="h-8 w-8" />}
        title="Couldn't load this article"
        description={error.message}
      />
    </PageShell>
  ),
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
  const { data } = useSuspenseQuery(postQuery(slug));
  if (!data) return null;
  const { post, others } = data;
  const paragraphs = (post.body ?? "").split(/\n\s*\n/).filter(Boolean);

  return (
    <PageShell>
      <TopBar title={(post.tags ?? [])[0] ?? "Journal"} backTo="/blogs" />
      <article className="p-4 lg:mx-auto lg:max-w-3xl lg:px-0 lg:py-8">
        {post.cover_url && (
          <img
            src={post.cover_url}
            alt={post.title}
            className="mb-5 h-48 w-full rounded-2xl object-cover lg:h-80"
          />
        )}
        <h1 className="text-xl font-bold leading-snug text-foreground lg:text-3xl">{post.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span>{post.author ?? "Store team"}</span>
          <span>·</span>
          <span>{formatDate(post.published_at ?? post.created_at)}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {post.read_minutes ?? 4} min read
          </span>
        </div>
        <div className="mt-5 space-y-4">
          {paragraphs.map((para) => (
            <p key={para.slice(0, 24)} className="text-sm leading-relaxed text-muted-foreground lg:text-base">
              {para}
            </p>
          ))}
        </div>
      </article>

      {others.length > 0 && (
        <section className="px-4 pb-8 lg:mx-auto lg:max-w-3xl lg:px-0">
          <h2 className="mb-2 text-sm font-bold">Read next</h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
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
      )}
    </PageShell>
  );
}
