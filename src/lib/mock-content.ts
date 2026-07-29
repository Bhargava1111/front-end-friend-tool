export type Coupon = {
  code: string;
  title: string;
  description: string;
  discount: string;
  minOrder: number;
};

export const COUPONS: Coupon[] = [
  {
    code: "FIRST100",
    title: "₹100 off first order",
    description: "Valid on your very first order",
    discount: "₹100 OFF",
    minOrder: 399,
  },
  {
    code: "POOJA15",
    title: "15% off pooja essentials",
    description: "Agarbatti, lamps, kumkum & more",
    discount: "15% OFF",
    minOrder: 299,
  },
  {
    code: "FREESHIP",
    title: "Free delivery",
    description: "No delivery fee on any order",
    discount: "FREE SHIP",
    minOrder: 249,
  },
];

export type Brand = { name: string; tagline: string; initials: string };

export const BRANDS: Brand[] = [
  { name: "Aashirvaad", tagline: "Atta & staples", initials: "AA" },
  { name: "Cycle Pure", tagline: "Agarbatti", initials: "CP" },
  { name: "Nandini", tagline: "Dairy & ghee", initials: "ND" },
  { name: "24 Mantra", tagline: "Organic", initials: "24" },
  { name: "Tata Sampann", tagline: "Dals & spices", initials: "TS" },
  { name: "Saffola", tagline: "Oils", initials: "SF" },
];

export const TRENDING_SEARCHES = [
  "Sona masoori rice",
  "Cow ghee",
  "Sambrani cups",
  "Cashew",
  "Turmeric",
  "Cotton wicks",
  "Jaggery",
  "Agarbatti",
];

export const OFFER_CARDS = [
  {
    title: "Pooja Combo",
    subtitle: "Everything for daily rituals",
    cta: "Shop combo",
    slug: "pooja-essentials",
    tone: "accent" as const,
  },
  {
    title: "Monthly Staples",
    subtitle: "Stock up & save up to 20%",
    cta: "Start stocking",
    slug: "groceries",
    tone: "primary" as const,
  },
];

/** Flash sale window: resets every day at midnight local time. */
export function flashSaleEndsAt() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}
