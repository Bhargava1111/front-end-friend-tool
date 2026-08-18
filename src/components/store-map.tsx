import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { env } from "@/lib/env";
import { projectPoints, type LatLng, type StoreLocation } from "@/lib/geo";

const BROWSER_KEY = env.googleMapsApiKey || undefined;
const TRACKING_ID = env.googleMapsTrackingId || undefined;
const MAPS_API_BASE = env.googleMapsApiKey
  ? `https://maps.googleapis.com/maps/api/js?key=${env.googleMapsApiKey}`
  : "";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any;
    __smsMapReady?: () => void;
  }
}

function loadGoogleMaps() {
  if (typeof window === "undefined" || !BROWSER_KEY) return Promise.resolve(null);
  if (window.google?.maps) return Promise.resolve(window.google);
  return new Promise<unknown>((resolve) => {
    window.__smsMapReady = () => resolve(window.google);
    const existing = document.querySelector<HTMLScriptElement>("script[data-sms-map]");
    if (existing) return;
    const script = document.createElement("script");
    script.dataset.smsMap = "true";
    script.async = true;
    script.src = `${MAPS_API_BASE}&loading=async&callback=__smsMapReady${
      TRACKING_ID ? `&channel=${TRACKING_ID}` : ""
    }`;
    document.head.appendChild(script);
  });
}

type MapProps = {
  stores: StoreLocation[];
  center?: LatLng | null;
  activeId?: string | null;
  onSelect?: (store: StoreLocation) => void;
  className?: string;
};

/**
 * Renders a live Google map when a Maps key is connected, and a styled
 * schematic map (same data, same interactions) when it is not.
 */
export function StoreMap({ stores, center, activeId, onSelect, className }: MapProps) {
  const [hasLiveMap, setHasLiveMap] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!BROWSER_KEY) return;
    loadGoogleMaps().then((google) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = google as any;
      if (cancelled || !g?.maps || !containerRef.current) return;
      mapRef.current = new g.maps.Map(containerRef.current, {
        center: center ?? { lat: stores[0]?.latitude ?? 13.04, lng: stores[0]?.longitude ?? 80.23 },
        zoom: 12,
        disableDefaultUI: true,
        zoomControl: true,
      });
      setHasLiveMap(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (typeof window !== "undefined" ? window.google : undefined) as any;
    if (!hasLiveMap || !g?.maps || !mapRef.current) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = stores.map((store) => {
      const marker = new g.maps.Marker({
        position: { lat: store.latitude, lng: store.longitude },
        map: mapRef.current,
        title: store.name,
      });
      marker.addListener("click", () => onSelect?.(store));
      return marker;
    });
    if (center) mapRef.current.panTo(center);
  }, [hasLiveMap, stores, center, onSelect]);

  const points = useMemo(
    () =>
      projectPoints([
        ...stores.map((s) => ({ lat: s.latitude, lng: s.longitude })),
        ...(center ? [center] : []),
      ]),
    [stores, center],
  );

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border bg-primary-soft/40",
        className,
      )}
    >
      {BROWSER_KEY && <div ref={containerRef} className="absolute inset-0" />}

      {!hasLiveMap && (
        <div className="absolute inset-0">
          {/* schematic street grid */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
          <svg className="absolute inset-0 h-full w-full opacity-40" aria-hidden>
            <defs>
              <pattern id="sms-grid" width="34" height="34" patternUnits="userSpaceOnUse">
                <path
                  d="M34 0H0V34"
                  fill="none"
                  stroke="currentColor"
                  className="text-primary/25"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#sms-grid)" />
            <path
              d="M0 70 Q 120 40 260 110 T 520 90"
              fill="none"
              stroke="currentColor"
              className="text-accent/40"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M60 320 Q 180 220 300 260 T 540 200"
              fill="none"
              stroke="currentColor"
              className="text-primary/25"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>

          {stores.map((store, i) => {
            const p = points[i];
            if (!p) return null;
            const active = store.id === activeId;
            return (
              <button
                key={store.id}
                type="button"
                onClick={() => onSelect?.(store)}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-full"
                aria-label={store.name}
              >
                <span
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-full border-2 border-background shadow-lg transition-transform",
                    active
                      ? "scale-110 bg-accent text-accent-foreground"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  <MapPin className="h-4 w-4" />
                </span>
              </button>
            );
          })}

          {center && points.length > stores.length && (
            <span
              style={{
                left: `${points[points.length - 1].x}%`,
                top: `${points[points.length - 1].y}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
            >
              <span className="relative grid h-5 w-5 place-items-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
                <span className="relative grid h-5 w-5 place-items-center rounded-full border-2 border-background bg-accent text-accent-foreground">
                  <Navigation className="h-2.5 w-2.5" />
                </span>
              </span>
            </span>
          )}

          {!BROWSER_KEY && (
            <span className="absolute bottom-2 right-3 rounded-full bg-background/80 px-2 py-1 text-[10px] font-medium text-muted-foreground backdrop-blur">
              Schematic view
            </span>
          )}
        </div>
      )}
    </div>
  );
}
