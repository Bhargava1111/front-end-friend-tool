import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Banner } from "@/lib/types";

type SlideBanner = Pick<Banner, "id" | "title" | "image_url"> & {
  subtitle?: string | null;
  link_slug?: string | null;
};

export function BannerSlider({
  banners,
  className,
  autoplay = true,
  interval = 4500,
}: {
  banners: SlideBanner[];
  className?: string;
  autoplay?: boolean;
  interval?: number;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = banners.length;

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (!autoplay || paused || count <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => clearInterval(id);
  }, [autoplay, paused, count, interval]);

  useEffect(() => {
    if (index > count - 1) setIndex(0);
  }, [count, index]);

  if (count === 0) return null;

  // With many banners, dots become pills in a scrollable strip.
  const compactDots = count > 8;

  return (
    <div className={cn("px-4", className)}>
      <div
        className="group relative overflow-hidden rounded-3xl card-elevated"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={(e) => {
          touchX.current = e.touches[0]?.clientX ?? null;
          setPaused(true);
        }}
        onTouchEnd={(e) => {
          const start = touchX.current;
          const end = e.changedTouches[0]?.clientX ?? null;
          if (start !== null && end !== null && Math.abs(end - start) > 45) {
            go(index + (end < start ? 1 : -1));
          }
          touchX.current = null;
          setPaused(false);
        }}
      >
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {banners.map((banner, i) => {
            const content = (
              <div className="relative aspect-[16/9] w-full shrink-0 sm:aspect-[21/9] lg:aspect-[24/9]">
                <img
                  src={banner.image_url}
                  alt={banner.title}
                  loading={i === 0 ? "eager" : "lazy"}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                  <h2 className="text-lg font-bold text-background sm:text-2xl lg:text-3xl">
                    {banner.title}
                  </h2>
                  {banner.subtitle && (
                    <p className="mt-1 text-xs text-background/85 sm:text-sm">{banner.subtitle}</p>
                  )}
                </div>
              </div>
            );
            return banner.link_slug ? (
              <Link
                key={banner.id}
                to="/category/$slug"
                params={{ slug: banner.link_slug }}
                className="w-full shrink-0"
              >
                {content}
              </Link>
            ) : (
              <div key={banner.id} className="w-full shrink-0">
                {content}
              </div>
            );
          })}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous banner"
              onClick={() => go(index - 1)}
              className="absolute left-3 top-1/2 hidden -translate-y-1/2 place-items-center rounded-full bg-background/85 p-2 text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 md:grid"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next banner"
              onClick={() => go(index + 1)}
              className="absolute right-3 top-1/2 hidden -translate-y-1/2 place-items-center rounded-full bg-background/85 p-2 text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 md:grid"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="no-scrollbar absolute bottom-3 right-4 flex max-w-[70%] gap-1.5 overflow-x-auto">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === index}
                  onClick={() => go(i)}
                  className={cn(
                    "h-1.5 shrink-0 rounded-full transition-all",
                    i === index
                      ? compactDots
                        ? "w-3 bg-accent"
                        : "w-5 bg-accent"
                      : "w-1.5 bg-background/60",
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
