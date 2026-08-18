import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LocateFixed, Navigation, Phone, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { PageShell, TopBar } from "@/components/page-shell";
import { StoreMap } from "@/components/store-map";
import { useStores } from "@/components/location-bar";
import { Button } from "@/components/ui/button";
import { useDeliveryLocation } from "@/lib/client-store";
import { distanceKm, etaMinutes, formatKm, locationFromCoords, nearestStore, type LatLng } from "@/lib/geo";
import { getDeviceCoords } from "@/lib/device-location";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stores")({
  head: () => ({
    meta: [
      { title: "Store Locator & Delivery Areas — Sri Mahalakshmi Stores" },
      {
        name: "description",
        content:
          "Find your nearest Sri Mahalakshmi Stores outlet on the map, check delivery radius, timings and estimated delivery time.",
      },
      { property: "og:title", content: "Store Locator — Sri Mahalakshmi Stores" },
      {
        property: "og:description",
        content: "Nearby outlets, delivery radius and live distance from your location.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StoreLocator,
});

function StoreLocator() {
  const { data: stores = [], isLoading } = useStores();
  const { location, setLocation } = useDeliveryLocation();
  const [me, setMe] = useState<LatLng | null>(
    location?.lat != null && location?.lng != null ? { lat: location.lat, lng: location.lng } : null,
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const near = useMemo(() => (me ? nearestStore(me, stores) : null), [me, stores]);

  async function detect() {
    try {
      const pos = await getDeviceCoords();
      const coords = { lat: pos.latitude, lng: pos.longitude };
      setMe(coords);
      const next = await locationFromCoords(coords, stores, pos.accuracy);
      setLocation(next);
      toast.success("Showing stores near you");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't get your location");
    }
  }

  return (
    <PageShell>
      <TopBar title="Store locator" subtitle="Outlets, delivery areas & timings" backTo="/" />

      <div className="px-4 pt-4">
        <StoreMap
          stores={stores}
          center={me}
          activeId={activeId ?? near?.store.id ?? null}
          onSelect={(s) => setActiveId(s.id)}
          className="h-64"
        />

        <div className="mt-3 flex gap-2">
          <Button onClick={detect} className="flex-1 gap-2">
            <LocateFixed className="h-4 w-4" /> Locate me
          </Button>
          {near && (
            <Button
              variant="secondary"
              className="flex-1 gap-2"
              onClick={() => {
                setLocation({
                  label: near.store.name.split("—").pop()?.trim() ?? near.store.name,
                  detail: near.store.address_text,
                  lat: near.store.latitude,
                  lng: near.store.longitude,
                  pincode: near.store.pincode,
                  source: "store",
                });
                toast.success("Delivery store updated");
              }}
            >
              <Navigation className="h-4 w-4" /> Deliver from nearest
            </Button>
          )}
        </div>

        {near && (
          <div className="mt-3 rounded-2xl border border-primary/25 bg-primary-soft/50 p-3 text-sm">
            <p className="font-semibold text-foreground">{near.store.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatKm(near.km)} away · arrives in about {etaMinutes(near.km)} minutes
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 space-y-3 px-4">
        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-secondary" />
            ))}
          </div>
        )}
        {stores.map((s) => {
          const km = me ? distanceKm(me, { lat: s.latitude, lng: s.longitude }) : null;
          const active = (activeId ?? near?.store.id) === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveId(s.id)}
              className={cn(
                "w-full rounded-2xl border p-4 text-left transition-colors",
                active ? "border-primary bg-primary-soft/40" : "border-border bg-card",
              )}
            >
              <p className="text-sm font-semibold text-foreground">{s.name}</p>
              <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {s.address_text}, {s.city} {s.pincode}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {s.opening_hours}
                </span>
                {s.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {s.phone}
                  </span>
                )}
                <span className="font-medium text-primary">
                  {km != null ? `${formatKm(km)} away` : `Delivers within ${s.delivery_radius_km} km`}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </PageShell>
  );
}
