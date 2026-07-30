import { useState } from "react";
import { SlidersHorizontal, ArrowDownUp, X, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  DISCOUNT_STEPS,
  SORT_OPTIONS,
  activeFilterCount,
  type ProductFilters,
  type SortKey,
} from "@/lib/product-filters";

export type BrandOption = { id: string; name: string };

/** Horizontal quick-filter bar shown above product grids. */
export function FilterBar({
  filters,
  bounds,
  brands,
  onChange,
}: {
  filters: ProductFilters;
  bounds: { min: number; max: number };
  brands: BrandOption[];
  onChange: (next: ProductFilters) => void;
}) {
  const [openFilters, setOpenFilters] = useState(false);
  const [openSort, setOpenSort] = useState(false);
  const count = activeFilterCount(filters, bounds);
  const sortLabel = SORT_OPTIONS.find((s) => s.key === filters.sort)?.label ?? "Sort";

  return (
    <>
      <div className="no-scrollbar sticky top-[57px] z-20 flex gap-2 overflow-x-auto border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur-md">
        <Chip active={count > 0} onClick={() => setOpenFilters(true)} icon={<SlidersHorizontal className="h-3.5 w-3.5" />}>
          Filters{count > 0 ? ` (${count})` : ""}
        </Chip>
        <Chip active={filters.sort !== "relevance"} onClick={() => setOpenSort(true)} icon={<ArrowDownUp className="h-3.5 w-3.5" />}>
          {sortLabel}
        </Chip>
        {brands.length > 0 && (
          <Chip active={filters.brands.length > 0} onClick={() => setOpenFilters(true)}>
            Brand
          </Chip>
        )}
        <Chip
          active={filters.discount > 0}
          onClick={() => onChange({ ...filters, discount: filters.discount ? 0 : 25 })}
        >
          25% off+
        </Chip>
        <Chip
          active={filters.inStock}
          onClick={() => onChange({ ...filters, inStock: !filters.inStock })}
        >
          In stock
        </Chip>
        {count > 0 && (
          <button
            type="button"
            onClick={() =>
              onChange({ ...filters, min: 0, max: 0, brands: [], discount: 0, inStock: false })
            }
            className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-destructive"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      <FilterSheet
        open={openFilters}
        onOpenChange={setOpenFilters}
        filters={filters}
        bounds={bounds}
        brands={brands}
        onChange={onChange}
      />
      <SortSheet
        open={openSort}
        onOpenChange={setOpenSort}
        value={filters.sort}
        onChange={(sort) => onChange({ ...filters, sort })}
      />
    </>
  );
}

function Chip({
  children,
  active,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function FilterSheet({
  open,
  onOpenChange,
  filters,
  bounds,
  brands,
  onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  filters: ProductFilters;
  bounds: { min: number; max: number };
  brands: BrandOption[];
  onChange: (next: ProductFilters) => void;
}) {
  const [draft, setDraft] = useState(filters);
  const range: [number, number] = [
    draft.min || bounds.min,
    draft.max || bounds.max || bounds.min + 1,
  ];

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (v) setDraft(filters);
        onOpenChange(v);
      }}
    >
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pb-2 pt-4">
          <section>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Price</h3>
              <span className="text-xs text-muted-foreground">
                {formatINR(range[0])} – {formatINR(range[1])}
              </span>
            </div>
            <Slider
              className="mt-4"
              min={bounds.min}
              max={Math.max(bounds.max, bounds.min + 1)}
              step={1}
              value={range}
              onValueChange={([min, max]) => setDraft({ ...draft, min, max })}
            />
          </section>

          {brands.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-foreground">Brand</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {brands.map((b) => {
                  const on = draft.brands.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          brands: on
                            ? draft.brands.filter((id) => id !== b.id)
                            : [...draft.brands, b.id],
                        })
                      }
                      aria-pressed={on}
                      className={cn(
                        "min-h-11 rounded-full border px-4 text-xs font-semibold",
                        on
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-border bg-card text-foreground",
                      )}
                    >
                      {b.name}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-sm font-semibold text-foreground">Discount</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {DISCOUNT_STEPS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDraft({ ...draft, discount: draft.discount === d ? 0 : d })}
                  aria-pressed={draft.discount === d}
                  className={cn(
                    "min-h-11 rounded-full border px-4 text-xs font-semibold",
                    draft.discount === d
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-card text-foreground",
                  )}
                >
                  {d}% and above
                </button>
              ))}
            </div>
          </section>

          <section>
            <button
              type="button"
              onClick={() => setDraft({ ...draft, inStock: !draft.inStock })}
              aria-pressed={draft.inStock}
              className="flex min-h-11 w-full items-center justify-between rounded-2xl border border-border bg-card px-4 text-sm font-medium"
            >
              Only in-stock items
              <span
                className={cn(
                  "grid h-6 w-6 place-items-center rounded-md border",
                  draft.inStock ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}
              >
                {draft.inStock && <Check className="h-4 w-4" />}
              </span>
            </button>
          </section>
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t border-border bg-background pt-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() =>
              setDraft({ ...draft, min: 0, max: 0, brands: [], discount: 0, inStock: false })
            }
          >
            Reset
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onChange(draft);
              onOpenChange(false);
            }}
          >
            Show results
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function SortSheet({
  open,
  onOpenChange,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  value: SortKey;
  onChange: (key: SortKey) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Sort by</SheetTitle>
        </SheetHeader>
        <div className="mt-3 divide-y divide-border">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => {
                onChange(o.key);
                onOpenChange(false);
              }}
              className="flex min-h-12 w-full items-center justify-between text-sm text-foreground"
            >
              {o.label}
              {value === o.key && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
