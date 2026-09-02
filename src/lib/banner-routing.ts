import type { Banner } from "@/lib/types";

type BannerLinkTarget = {
  to: "/product/$slug" | "/category/$slug";
  params: { slug: string };
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

export function brandSectionHash(slug: string) {
  return `brand-${slug}`;
}
