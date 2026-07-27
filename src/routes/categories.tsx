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

  return (
    <PageShell>
      <header className="rounded-b-3xl bg-primary px-4 pb-6 pt-6 text-primary-foreground">
        <h1 className="text-xl font-bold">Categories</h1>
        <p className="mt-1 text-sm text-primary-foreground/75">
          Everything for your kitchen and your prayers
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 px-4 pt-5">
        {categories.map((c) => (
          <Link
            key={c.id}
            to="/category/$slug"
            params={{ slug: c.slug }}
            className="overflow-hidden rounded-2xl border border-border bg-card card-elevated"
          >
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
        ))}
      </div>
    </PageShell>
  );
}
