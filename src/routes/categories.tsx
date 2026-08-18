import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { getCategories } from "@/lib/catalog.functions";
import { PageShell } from "@/components/page-shell";

const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: () => getCategories(),
});

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "All Categories — Sri Mahalakshmi Stores" },
      {
        name: "description",
        content:
          "Browse grocery and pooja categories: rice, dals, oils, spices, dry fruits, flowers and more.",
      },
      { property: "og:title", content: "All Categories — Sri Mahalakshmi Stores" },
      {
        property: "og:description",
        content: "Browse every grocery and pooja category in our store.",
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(categoriesQuery);
  },
  component: CategoriesPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8 text-center text-sm">No categories found.</div>,
});

function CategoriesPage() {
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const topLevel = categories.filter((c) => !c.parent_id);
  const childrenOf = (parentId: string) =>
    categories.filter((c) => c.parent_id === parentId);

  return (
    <PageShell>
      <header className="rounded-b-3xl bg-primary px-4 pb-6 pt-6 text-primary-foreground">
        <h1 className="text-xl font-bold">Categories</h1>
        <p className="mt-1 text-sm text-primary-foreground/75">
          Everything for your kitchen and your prayers
        </p>
      </header>

      <div className="grid gap-4 px-4 pt-5 sm:grid-cols-2 lg:grid-cols-3">
        {topLevel.map((c) => {
          const children = childrenOf(c.id);
          return (
            <div key={c.id} className="overflow-hidden rounded-2xl border border-border bg-card card-elevated">
              <Link to="/category/$slug" params={{ slug: c.slug }}>
                <div className="aspect-[4/3] bg-accent-soft">
                  {c.image_url && (
                    <img
                      src={c.image_url}
                      alt={c.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-foreground">{c.name}</h2>
                    {c.description && (
                      <p className="truncate text-[11px] text-muted-foreground">{c.description}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
                </div>
              </Link>
              {children.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-border px-3 py-2">
                  {children.map((child) => (
                    <Link
                      key={child.id}
                      to="/category/$slug"
                      params={{ slug: child.slug }}
                      className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-foreground"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
