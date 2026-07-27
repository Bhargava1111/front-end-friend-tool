import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search as SearchIcon, X, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { searchProducts } from "@/lib/catalog.functions";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { ProductCard } from "@/components/product-card";
import { cn } from "@/lib/utils";

const SORTS = [
  { key: "relevance", label: "Relevance" },
  { key: "price_asc", label: "Price: Low to High" },
  { key: "price_desc", label: "Price: High to Low" },
  { key: "newest", label: "Newest" },
] as const;

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search Products — Sri Mahalakshmi Stores" },
      {
        name: "description",
        content: "Search groceries and pooja essentials by name, brand or category.",
      },
      { property: "og:title", content: "Search Products — Sri Mahalakshmi Stores" },
      {
        property: "og:description",
        content: "Find the exact grocery or pooja item you need in seconds.",
      },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [term, setTerm] = useState("");
  const [sort, setSort] = useState<(typeof SORTS)[number]["key"]>("relevance");
  const run = useServerFn(searchProducts);

  const { data, isFetching } = useQuery({
    queryKey: ["search", term, sort],
    queryFn: () => run({ data: { q: term, sort } }),
    enabled: term.trim().length > 1,
  });

  const results = data ?? [];

  return (
    <PageShell>
      <TopBar title="Search" backTo="/" />

      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
          <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search rice, ghee, agarbatti…"
            aria-label="Search products"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {term && (
            <button type="button" aria-label="Clear search" onClick={() => setTerm("")}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSort(s.key)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                sort === s.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {term.trim().length <= 1 ? (
        <EmptyState
          icon={<SearchIcon className="h-8 w-8" />}
          title="What are you looking for?"
          description="Type at least two characters to start searching."
        />
      ) : isFetching && results.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 px-4 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          icon={<SearchIcon className="h-8 w-8" />}
          title="No matches found"
          description={`We couldn't find anything for "${term}". Try a different word.`}
        />
      ) : (
        <>
          <p className="px-4 pt-4 text-xs text-muted-foreground">{results.length} results</p>
          <div className="grid grid-cols-2 gap-3 px-4 pt-2">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}
