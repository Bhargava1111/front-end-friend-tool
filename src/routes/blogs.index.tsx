import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Clock, Newspaper } from "lucide-react";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { Reveal } from "@/components/motion";
import { listBlogPosts } from "@/lib/blog.functions";
import { formatDate } from "@/lib/format";

const blogQuery = queryOptions({
  queryKey: ["blog-posts"],
  queryFn: () => listBlogPosts(),
});

export const Route = createFileRoute("/blogs/")({
  head: () => ({
    meta: [
      { title: "Kitchen & Pooja Journal — Sri Mahalakshmi Stores" },
      {
        name: "description",
        content:
          "Practical guides on daily pooja rituals, cooking oils, storing staples and running an Indian kitchen.",
      },
      { property: "og:title", content: "Kitchen & Pooja Journal" },
      {
        property: "og:description",
        content: "Guides on rituals, staples and everyday Indian cooking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(blogQuery);
  },
  component: BlogsPage,
  errorComponent: ({ error }) => (
    <PageShell>
      <TopBar title="Journal" backTo="/" />
      <EmptyState
        icon={<Newspaper className="h-8 w-8" />}
        title="Couldn't load the journal"
        description={error.message}
      />
    </PageShell>
  ),
  notFoundComponent: () => (
    <PageShell>
      <TopBar title="Journal" backTo="/" />
      <EmptyState
        icon={<Newspaper className="h-8 w-8" />}
        title="No articles yet"
        description="New guides are published every week."
      />
    </PageShell>
  ),
});

function BlogsPage() {
  const { data: posts } = useSuspenseQuery(blogQuery);

  return (
    <PageShell>
      <TopBar title="Journal" subtitle="Kitchen & pooja guides" backTo="/" />

      <section className="px-4 pt-4 lg:px-0">
        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/85 p-6 text-primary-foreground lg:p-10">
          <h2 className="text-lg font-bold lg:text-3xl">Stories from the store counter</h2>
          <p className="mt-2 max-w-xl text-sm text-primary-foreground/80">
            Rituals, recipes and buying guides written by the family that runs Sri Mahalakshmi
            Stores.
          </p>
        </div>
      </section>

      {posts.length === 0 ? (
        <EmptyState
          icon={<Newspaper className="h-8 w-8" />}
          title="No articles yet"
          description="Our team is writing the first guides. Check back soon."
        />
      ) : (
        <div className="grid gap-3 p-4 lg:grid-cols-3 lg:px-0">
          {posts.map((post, i) => (
            <Reveal key={post.slug} delay={i * 0.04}>
              <Link
                to="/blogs/$slug"
                params={{ slug: post.slug }}
                className="block h-full overflow-hidden rounded-2xl border border-border bg-card card-elevated"
              >
                {post.cover_url && (
                  <img
                    src={post.cover_url}
                    alt={post.title}
                    loading="lazy"
                    className="h-40 w-full object-cover"
                  />
                )}
                <div className="p-4">
                  {(post.tags ?? []).slice(0, 1).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                  <h2 className="mt-2.5 text-sm font-bold leading-snug text-foreground">
                    {post.title}
                  </h2>
                  <p className="mt-1.5 text-xs text-muted-foreground">{post.excerpt}</p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="truncate">{post.author ?? "Store team"}</span>
                    <span>·</span>
                    <span>{formatDate(post.published_at ?? post.created_at)}</span>
                    <span className="ml-auto flex shrink-0 items-center gap-1">
                      <Clock className="h-3 w-3" /> {post.read_minutes ?? 4} min
                    </span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </PageShell>
  );
}
