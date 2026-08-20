import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAdminFn } from "@/hooks/use-admin-fn";
import { getAdminBOGOClient, getAdminCategoryDiscountsClient } from "@/lib/admin-client.functions";

import { getAdminBOGO, getAdminCategoryDiscounts } from "@/lib/admin-platform.functions";

export const Route = createFileRoute("/admin/promotions")({
  component: AdminPromotions,
});

function AdminPromotions() {
  const fetchBogo = useAdminFn(getAdminBOGO, getAdminBOGOClient);
  const fetchCat = useAdminFn(getAdminCategoryDiscounts, getAdminCategoryDiscountsClient);
  const { data: bogo = [], isError } = useQuery({
    queryKey: ["admin-bogo"],
    queryFn: () => fetchBogo() as Promise<Array<Record<string, unknown>>>,
  });
  const { data: discounts = [], isError: catError } = useQuery({
    queryKey: ["admin-cat-discounts"],
    queryFn: () => fetchCat() as Promise<Array<Record<string, unknown>>>,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-base font-semibold">BOGO & category discounts</h1>
      {(isError || catError) && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Could not load promotions. Check that you are signed in as an admin with coupon access.
        </p>
      )}
      <section>
        <h2 className="text-sm font-semibold">Buy One Get One</h2>
        {bogo.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No BOGO promotions yet. Create via API or Django admin.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {bogo.map((b) => (
              <li key={String(b.id)} className="rounded-xl border border-border bg-card p-3 text-sm">
                {String(b.name)} — Buy {String(b.buy_product_name)} → Get {String(b.get_product_name)}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="text-sm font-semibold">Category discounts</h2>
        {discounts.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No category-wide discounts configured.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {discounts.map((d) => (
              <li key={String(d.id)} className="rounded-xl border border-border bg-card p-3 text-sm">
                {String(d.category_name)} — {Number(d.discount_percent)}% off
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
