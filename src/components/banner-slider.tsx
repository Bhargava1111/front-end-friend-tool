import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Banner } from "@/lib/types";

export function BannerSlider({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % banners.length), 4500);
    return () => clearInterval(id);
  }, [banners.length]);

  if (banners.length === 0) return null;

  return (
    <div className="px-4">
      <div className="relative overflow-hidden rounded-3xl card-elevated">
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {banners.map((banner) => {
            const content = (
              <div className="relative aspect-[16/9] w-full shrink-0">
                <img
                  src={banner.image_url}
                  alt={banner.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h2 className="text-lg font-bold text-background">{banner.title}</h2>
                  {banner.subtitle && (
                    <p className="mt-1 text-xs text-background/85">{banner.subtitle}</p>
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
        <div className="absolute bottom-3 right-4 flex gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-5 bg-accent" : "w-1.5 bg-background/60",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
