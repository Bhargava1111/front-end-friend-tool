import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ChevronDown, LocateFixed, MapPin, Store as StoreIcon } from "lucide-react";
import { toast } from "sonner";
import { getStoreLocations } from "@/lib/location.functions";
import { useDeliveryLocation } from "@/lib/client-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { distanceKm, etaMinutes, formatKm, nearestStore, type StoreLocation } from "@/lib/geo";
import { StoreMap } from "@/components/store-map";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function useStores() {
  const fetchStores = useServerFn(getStoreLocations);
  return useQuery({
    queryKey: ["stores"],
    queryFn: () => fetchStores() as Promise<StoreLocation[]>,
    staleTime: 5 * 60 * 1000,
  });
}

export function LocationBar({ className }: { className?: string }) {
  const hydrated = useHydrated();
  const { location } = useDeliveryLocation();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" className={cn("min-w-0 text-left", className)}>
          <span className="flex items-center gap-1 text-xs text-primary-foreground/70">
            <MapPin className="h-3.5 w-3.5 shrink-0" /> Deliver to
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-sm font-semibold">
            <span className="truncate">
              {hydrated && location ? location.label : "Set your location"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-80" />
          </span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle>Delivery location</SheetTitle>
        </SheetHeader>
        <LocationPicker onDone={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

export function LocationPicker({ onDone }: { onDone?: () => void }) {
  const { data: stores = [] } = useStores();
  const { location, setLocation } = useDeliveryLocation();
  const [pincode, setPincode] = useState("");
  const [locating, setLocating] = useState(false);

  const point = location?.lat != null && location?.lng != null
    ? { lat: location.lat, lng: location.lng }
    : null;
  const near = useMemo(() => (point ? nearestStore(point, stores) : null), [point, stores]);

  function detect() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Location is not available on this device");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const closest = nearestStore(coords, stores);
        setLocation({
          label: closest ? `Near ${closest.store.name.split("—").pop()?.trim()}` : "Current location",
          detail: closest
            ? `${formatKm(closest.km)} from ${closest.store.name}`
            : `${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`,
          lat: coords.lat,
          lng: coords.lng,
          source: "gps",
        });
        setLocating(false);
        toast.success("Location updated");
      },
      () => {
        setLocating(false);
        toast.error("Couldn't get your location. Pick a store instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <StoreMap
        stores={stores}
        center={point}
        activeId={near?.store.id ?? null}
        onSelect={(s) =>
          setLocation({
            label: s.name.split("—").pop()?.trim() ?? s.name,
            detail: s.address_text,
            lat: s.latitude,
            lng: s.longitude,
            pincode: s.pincode,
            source: "store",
          })
        }
        className="h-52"
      />

      <Button onClick={detect} disabled={locating} className="w-full gap-2">
        <LocateFixed className="h-4 w-4" />
        {locating ? "Detecting…" : "Use my current location"}
      </Button>

      <div className="flex gap-2">
        <Input
          inputMode="numeric"
          maxLength={6}
          placeholder="Enter 6-digit pincode"
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
        />
        <Button
          variant="secondary"
          onClick={() => {
            if (pincode.length !== 6) return toast.error("Enter a valid 6-digit pincode");
            const match = stores.find((s) => s.pincode === pincode);
            setLocation({
              label: match ? (match.name.split("—").pop()?.trim() ?? pincode) : `Pincode ${pincode}`,
              detail: match ? match.address_text : "We deliver to this pincode",
              lat: match?.latitude ?? null,
              lng: match?.longitude ?? null,
              pincode,
              source: "manual",
            });
            toast.success("Delivery pincode saved");
          }}
        >
          Apply
        </Button>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Nearby stores
        </p>
        <div className="space-y-2">
          {stores.map((s) => {
            const km = point ? distanceKm(point, { lat: s.latitude, lng: s.longitude }) : null;
            const active = location?.lat === s.latitude && location?.lng === s.longitude;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setLocation({
                    label: s.name.split("—").pop()?.trim() ?? s.name,
                    detail: s.address_text,
                    lat: s.latitude,
                    lng: s.longitude,
                    pincode: s.pincode,
                    source: "store",
                  });
                  toast.success("Delivery store selected");
                  onDone?.();
                }}
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors",
                  active ? "border-primary bg-primary-soft/50" : "border-border bg-card",
                )}
              >
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                  <StoreIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {s.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {s.address_text}, {s.city}
                  </span>
                  <span className="mt-1 block text-[11px] font-medium text-primary">
                    {km != null ? `${formatKm(km)} away · ` : ""}
                    {km != null ? `${etaMinutes(km)} min delivery` : s.opening_hours}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Link
        to="/stores"
        onClick={() => onDone?.()}
        className="block rounded-2xl border border-dashed border-border px-4 py-3 text-center text-sm font-medium text-primary"
      >
        Open full store locator
      </Link>
    </div>
  );
}
