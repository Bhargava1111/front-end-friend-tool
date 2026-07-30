import { useState } from "react";
import { ZoomIn, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Product gallery with a thumbnail strip, hover pan-zoom on pointer devices and
 * a full-screen zoom overlay for touch.
 */
export function ImageGallery({
  images,
  alt,
  badge,
}: {
  images: string[];
  alt: string;
  badge?: React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const list = images.length ? images : [];

  if (list.length === 0) {
    return <div className="aspect-square w-full bg-secondary" aria-hidden="true" />;
  }

  return (
    <>
      <div
        className="relative aspect-square w-full overflow-hidden bg-secondary"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
        }}
      >
        <img
          src={list[active]}
          alt={alt}
          style={{ transformOrigin: origin }}
          className="h-full w-full object-cover transition-transform duration-300 md:hover:scale-[1.8]"
        />
        {badge}
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label="Zoom image"
          className="absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full bg-background/80 text-foreground backdrop-blur"
        >
          <ZoomIn className="h-5 w-5" />
        </button>
      </div>

      {list.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-3">
          {list.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === active}
              className={cn(
                "h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-secondary transition-colors",
                i === active ? "border-primary" : "border-transparent",
              )}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {zoomed && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-background/95 p-4 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-label="Zoomed product image"
          onClick={() => setZoomed(false)}
        >
          <img src={list[active]} alt={alt} className="max-h-full w-full rounded-2xl object-contain" />
          <button
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="Close zoom"
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </>
  );
}
