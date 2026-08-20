import type { Banner } from "@/lib/types";

const FESTIVE_RE =
  /festiv|pooja|puja|navrat|diwali|ganesh|ritual|temple|agarbatti|deepam|karthigai|pongal|onam|holi|ugadi|durga|lakshmi/;
const OFFER_RE = /offer|deal|save|%|off\b|discount|combo|sale|bogo|flat/;

function bannerText(banner: Banner) {
  return `${banner.title} ${banner.subtitle ?? ""} ${banner.link_slug ?? ""}`.toLowerCase();
}

export function looksFestiveBanner(banner: Banner) {
  return FESTIVE_RE.test(bannerText(banner));
}

export function looksOfferBanner(banner: Banner) {
  return OFFER_RE.test(bannerText(banner)) && !looksFestiveBanner(banner);
}

/** Split home payload so hero, offers and festival banners never share one mixed strip. */
export function splitHomeBanners(data: {
  banners?: Banner[];
  offer_banners?: Banner[];
  festive_banners?: Banner[];
}) {
  const home = Array.isArray(data.banners) ? data.banners : [];
  const apiOffers = Array.isArray(data.offer_banners) ? data.offer_banners : [];
  const apiFestive = Array.isArray(data.festive_banners) ? data.festive_banners : [];

  if (apiOffers.length || apiFestive.length) {
    return {
      heroBanners: home,
      offerBanners: apiOffers,
      festiveBanners: apiFestive,
    };
  }

  const festiveBanners = home.filter(looksFestiveBanner);
  const offerBanners = home.filter(looksOfferBanner);
  const classified = new Set([...festiveBanners, ...offerBanners].map((b) => b.id));
  let heroBanners = home.filter((b) => !classified.has(b.id));

  if (!heroBanners.length && !offerBanners.length && !festiveBanners.length) {
    heroBanners = home.slice(0, 3);
    const rest = home.slice(3);
    return {
      heroBanners,
      offerBanners: rest.filter((_, i) => i % 2 === 0),
      festiveBanners: rest.filter((_, i) => i % 2 === 1),
    };
  }

  if (!heroBanners.length && home.length) {
    heroBanners = [home[0]];
    const heroId = home[0].id;
    return {
      heroBanners,
      offerBanners: offerBanners.filter((b) => b.id !== heroId),
      festiveBanners: festiveBanners.filter((b) => b.id !== heroId),
    };
  }

  return { heroBanners, offerBanners, festiveBanners };
}
