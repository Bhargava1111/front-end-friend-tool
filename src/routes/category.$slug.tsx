import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getCategoryWithProducts } from "@/lib/catalog.functions";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { ProductCard } from "@/components/product-card";
import { PackageSearch } from "lucide-react";

const categoryQuery = (slug: string) =>
  queryOptions({
    queryKey: ["category", slug],
    queryFn: () => getCategoryWithProducts({ data: { slug } }),
  });

export const Route = createFileRoute("/category/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(categoryQuery(params.slug));
    if (!data.category) throw notFound();
    return { name: data.category.name, description: data.category.description };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Category unavailable" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${loaderData.name} — Sri Mahalakshmi Stores`;
    const description =
      loaderData.description ?? `Shop ${loaderData.name} online with fast doorstep delivery.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: CategoryPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => (
    <PageShell>
      <TopBar title="Category not found" backTo="/categories" />
      <EmptyState
        icon={<PackageSearch className="h-8 w-8" />}
        title="We couldn't find that category"
        description="It may have been renamed or removed."
      />
    </PageShell>
  ),
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(categoryQuery(slug));

  return (
    <PageShell>
      <TopBar
        title={data.category?.name ?? "Category"}
        subtitle={`${data.products.length} products`}
        backTo="/categories"
      />
      {data.products.length === 0 ? (
        <EmptyState
          icon={<PackageSearch className="h-8 w-8" />}
          title="Nothing here yet"
          description="Products in this category are coming soon."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 pt-4">
          {data.products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
