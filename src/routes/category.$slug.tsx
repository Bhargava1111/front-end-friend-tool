import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { PackageSearch } from "lucide-react";
import { getCategoryWithProducts } from "@/lib/catalog.functions";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { ProductCard } from "@/components/product-card";
import { CategorySideRail } from "@/components/category-side-rail";
import { FilterBar } from "@/components/filter-sheet";
import {
  applyFilters,
  priceBounds,
  type ProductFilters,
  type SortKey,
} from "@/lib/product-filters";

const SORTS: SortKey[] = ["relevance", "price_asc", "price_desc", "discount", "newest"];

type CategorySearch = {
  min: number;
  max: number;
  brands: string[];
  discount: number;
  inStock: boolean;
  sort: SortKey;
};

const categoryQuery = (slug: string) =>
  queryOptions({
    queryKey: ["category", slug],
    queryFn: () => getCategoryWithProducts({ data: { slug } }),
  });

export const Route = createFileRoute("/category/$slug")({
  validateSearch: (search: Record<string, unknown>): CategorySearch => {
    const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const sort = String(search.sort ?? "relevance") as SortKey;
    return {
      min: num(search.min),
      max: num(search.max),
      brands: Array.isArray(search.brands)
        ? (search.brands as unknown[]).map(String)
        : typeof search.brands === "string" && search.brands
          ? search.brands.split(",")
          : [],
      discount: num(search.discount),
      inStock: search.inStock === true || search.inStock === "true",
      sort: SORTS.includes(sort) ? sort : "relevance",
    };
  },
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
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
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
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data } = useSuspenseQuery(categoryQuery(slug));

  const bounds = priceBounds(data.products);
  const filters: ProductFilters = { ...search };
  const visible = applyFilters(data.products, filters);

  const setFilters = (next: ProductFilters) =>
    navigate({
      search: {
        min: next.min,
        max: next.max,
        brands: next.brands,
        discount: next.discount,
        inStock: next.inStock,
        sort: next.sort,
      },
      replace: true,
    });

  return (
    <PageShell>
      <TopBar
        title={data.category?.name ?? "Category"}
        subtitle={`${visible.length} of ${data.products.length} products`}
        backTo="/categories"
      />
      <FilterBar
        filters={filters}
        bounds={bounds}
        brands={data.brands}
        onChange={setFilters}
      />

      <div className="flex">
        <CategorySideRail categories={data.categories} activeSlug={slug} />
        <div className="min-w-0 flex-1">
          {visible.length === 0 ? (
            <EmptyState
              icon={<PackageSearch className="h-8 w-8" />}
              title={data.products.length ? "No matches" : "Nothing here yet"}
              description={
                data.products.length
                  ? "Try relaxing the filters to see more products."
                  : "Products in this category are coming soon."
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 p-3">
              {visible.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
