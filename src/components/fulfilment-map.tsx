import { useMemo } from "react";
import { Truck } from "lucide-react";
import { useStores } from "@/components/location-bar";
import { StoreMap } from "@/components/store-map";
import { useDeliveryLocation } from "@/lib/client-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { etaMinutes, formatKm, nearestStore } from "@/lib/geo";

/** Small map strip showing which outlet will fulfil the order and the ETA. */
export function FulfilmentMap() {
  const hydrated = useHydrated();
  const { data: stores = [] } = useStores();
  const { location } = useDeliveryLocation();

  const point =
    location?.lat != null && location?.lng != null
      ? { lat: location.lat, lng: location.lng }
      : null;
  const near = useMemo(() => (point ? nearestStore(point, stores) : null), [point, stores]);

  if (!hydrated) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <StoreMap
        stores={stores}
        center={point}
        activeId={near?.store.id ?? null}
        className="h-36 rounded-none border-0"
      />
      <div className="flex items-center gap-2 p-3 text-xs">
        <Truck className="h-4 w-4 shrink-0 text-primary" />
        <span className="text-muted-foreground">
          {near
            ? `Fulfilled by ${near.store.name} · ${formatKm(near.km)} away · arrives in about ${etaMinutes(near.km)} min`
            : "Set your delivery location to see the nearest fulfilling outlet."}
        </span>
      </div>
    </div>
  );
}
