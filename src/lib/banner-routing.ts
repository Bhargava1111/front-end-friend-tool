import type { Banner } from "@/lib/types";

type BannerLinkTarget = {
  to: "/product/$slug" | "/category/$slug";
  params: { slug: string };
};

type BrandLike = {
  id: string;
  name: string;
  slug?: string | null;
};

export function resolveBannerLink(
  banner: Pick<Banner, "link_slug" | "product">,
): BannerLinkTarget | null {
  const productSlug = banner.product?.slug?.trim();
  if (productSlug) {
    return { to: "/product/$slug", params: { slug: productSlug } };
  }

  const categorySlug = banner.link_slug?.trim();
  if (categorySlug) {
    return { to: "/category/$slug", params: { slug: categorySlug } };
  }

  return null;
}

export function brandLinkTarget(brand: { slug: string }) {
  return {
    to: "/brands/$slug" as const,
    params: { slug: brand.slug },
  };
}

export function resolveBrandFromParam(brands: BrandLike[], param?: string | null) {
  const value = param?.trim();
  if (!value) return null;

  const byId = brands.find((brand) => brand.id === value);
  if (byId) return byId;

  const normalized = value.toLowerCase();
  return (
    brands.find((brand) => brand.slug?.toLowerCase() === normalized) ??
    brands.find((brand) => brand.name.toLowerCase().replace(/\s+/g, "-") === normalized) ??
    null
  );
}
