import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Search as SearchIcon,
  X,
  SlidersHorizontal,
  Mic,
  ScanLine,
  Sparkles,
  TrendingUp,
  Clock,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { searchProducts } from "@/lib/catalog.functions";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { ProductCard } from "@/components/product-card";
import { GridSkeleton } from "@/components/skeletons";
import { Reveal } from "@/components/motion";
import { useHydrated } from "@/hooks/use-hydrated";
import { useRecentSearches } from "@/lib/client-store";
import { trackSearch } from "@/lib/analytics";
import { TRENDING_SEARCHES } from "@/lib/mock-content";
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
  const hydrated = useHydrated();
  const { terms: recent, add: addRecent, remove: removeRecent, clear } = useRecentSearches();

  const active = term.trim().length > 1;

  const { data, isFetching } = useQuery({
    queryKey: ["search", term, sort],
    queryFn: () => searchProducts({ data: { q: term, sort } }),
    enabled: active,
  });
  const lastTracked = useRef<{ key: string; at: number } | null>(null);
  const SEARCH_TRACK_COOLDOWN_MS = 30_000;

  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => addRecent(term), 900);
    return () => clearTimeout(id);
  }, [term, active, addRecent]);

  useEffect(() => {
    if (!active || isFetching || !data) return;
    const key = `${term.trim().toLowerCase()}|${sort}|${data.count}`;
    const now = Date.now();
    if (
      lastTracked.current &&
      lastTracked.current.key === key &&
      now - lastTracked.current.at < SEARCH_TRACK_COOLDOWN_MS
    ) {
      return;
    }
    const id = setTimeout(() => {
      lastTracked.current = { key, at: Date.now() };
      void trackSearch({
        query: term.trim(),
        resultsCount: data.count,
        filters: { sort },
      });
    }, 700);
    return () => clearTimeout(id);
  }, [active, isFetching, data, term, sort]);

  const results = data?.results ?? [];
  const suggestions = TRENDING_SEARCHES.filter((t) =>
    active ? t.toLowerCase().includes(term.trim().toLowerCase()) : false,
  ).slice(0, 4);

  return (
    <PageShell>
      <TopBar title="Search" backTo="/" />

      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 card-elevated">
          <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search rice, ghee, agarbatti…"
            aria-label="Search products"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {term ? (
            <button type="button" aria-label="Clear search" onClick={() => setTerm("")}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Voice search"
                onClick={() => toast.info("Voice search is coming soon")}
                className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft text-primary"
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Scan a barcode"
                onClick={() => toast.info("Barcode scanning is coming soon")}
                className="grid h-8 w-8 place-items-center rounded-full bg-accent-soft text-accent-foreground"
              >
                <ScanLine className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-accent" /> Smart search understands names, weights and
          brands
        </p>

        {suggestions.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTerm(s)}
                className="flex w-full items-center gap-2 border-b border-border px-4 py-2.5 text-left text-sm text-foreground last:border-0"
              >
                <SearchIcon className="h-3.5 w-3.5 text-muted-foreground" />
                {s}
              </button>
            ))}
          </div>
        )}

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

      {!active ? (
        <div className="px-4 pt-6">
          {hydrated && recent.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Clock className="h-4 w-4 text-muted-foreground" /> Recent searches
                </h2>
                <button
                  type="button"
                  onClick={clear}
                  className="text-xs font-medium text-primary"
                >
                  Clear all
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {recent.map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground"
                  >
                    <button type="button" onClick={() => setTerm(t)}>
                      {t}
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${t} from recent searches`}
                      onClick={() => removeRecent(t)}
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </span>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <TrendingUp className="h-4 w-4 text-accent" /> Trending searches
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {TRENDING_SEARCHES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTerm(t)}
                  className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent-foreground transition-transform active:scale-95"
                >
                  {t}
                </button>
              ))}
            </div>
          </section>

          <EmptyState
            icon={<SearchIcon className="h-8 w-8" />}
            title="What are you looking for?"
            description="Type at least two characters to start searching."
          />
        </div>
      ) : isFetching && results.length === 0 ? (
        <GridSkeleton count={6} />
      ) : results.length === 0 ? (
        <EmptyState
          icon={<SearchIcon className="h-8 w-8" />}
          title="No matches found"
          description={`We couldn't find anything for "${term}". Try a different word.`}
        />
      ) : (
        <>
          <p className="px-4 pt-4 text-xs text-muted-foreground">{data?.count ?? results.length} results</p>
          <div className="grid grid-cols-2 gap-3 px-4 pt-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
            {results.map((p, i) => (
              <Reveal key={p.id} delay={Math.min(i, 6) * 0.03}>
                <ProductCard product={p} fromSearch />
              </Reveal>
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}
