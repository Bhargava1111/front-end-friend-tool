import type { CartLine } from "./types";

export type CouponRow = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_order: number;
  max_discount: number | null;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
};

export type StoreSettings = {
  delivery_fee: number;
  free_delivery_above: number;
  tax_rate: number;
  maintenance_mode: boolean;
  support_phone: string;
  support_email: string;
};

export const DEFAULT_SETTINGS: StoreSettings = {
  delivery_fee: 40,
  free_delivery_above: 499,
  tax_rate: 5,
  maintenance_mode: false,
  support_phone: "+91 98400 12345",
  support_email: "care@srimahalakshmistores.in",
};

/** Effective unit price of a cart line — the chosen pack size wins over the base product. */
export function lineUnitPrice(line: CartLine) {
  return Number(line.variant?.price ?? line.product.price);
}

export function cartSubtotal(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + lineUnitPrice(l) * l.quantity, 0);
}

export function couponError(coupon: CouponRow, subtotal: number): string | null {
  if (!coupon.is_active) return "This coupon is no longer active.";
  if (coupon.starts_at && new Date(coupon.starts_at) > new Date()) return "This coupon isn't live yet.";
  if (coupon.ends_at && new Date(coupon.ends_at) < new Date()) return "This coupon has expired.";
  if (subtotal < Number(coupon.min_order))
    return `Add ₹${Math.ceil(Number(coupon.min_order) - subtotal)} more to use ${coupon.code}.`;
  return null;
}

export type PriceBreakdown = {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  tax: number;
  total: number;
  freeShipping: boolean;
  amountToFreeDelivery: number;
};

export function computeTotals({
  subtotal,
  coupon,
  settings,
}: {
  subtotal: number;
  coupon?: CouponRow | null;
  settings: StoreSettings;
}): PriceBreakdown {
  let discount = 0;
  let freeShipping = false;

  if (coupon && !couponError(coupon, subtotal)) {
    if (coupon.discount_type === "percent") {
      discount = (subtotal * Number(coupon.discount_value)) / 100;
      if (coupon.max_discount) discount = Math.min(discount, Number(coupon.max_discount));
    } else if (coupon.discount_type === "flat") {
      discount = Number(coupon.discount_value);
    } else if (coupon.discount_type === "free_shipping") {
      freeShipping = true;
    }
  }
  discount = Math.min(Math.round(discount), subtotal);

  const base = subtotal - discount;
  const qualifies = subtotal >= settings.free_delivery_above || subtotal === 0;
  const deliveryFee = freeShipping || qualifies ? 0 : settings.delivery_fee;
  const tax = Math.round((base * settings.tax_rate) / 100);

  return {
    subtotal,
    discount,
    deliveryFee,
    tax,
    total: base + deliveryFee + tax,
    freeShipping: deliveryFee === 0,
    amountToFreeDelivery: Math.max(0, settings.free_delivery_above - subtotal),
  };
}

/* ----------------------------- DELIVERY SLOTS ---------------------------- */

export type DeliverySlot = { id: string; day: string; window: string; label: string; soon?: boolean };

export function deliverySlots(now = new Date()): DeliverySlot[] {
  const hour = now.getHours();
  const windows = [
    { window: "8:00 AM – 11:00 AM", from: 8 },
    { window: "11:00 AM – 2:00 PM", from: 11 },
    { window: "2:00 PM – 5:00 PM", from: 14 },
    { window: "5:00 PM – 9:00 PM", from: 17 },
  ];
  const slots: DeliverySlot[] = [
    { id: "express", day: "Today", window: "Within 90 minutes", label: "Today · Express", soon: true },
  ];
  for (const w of windows) {
    if (w.from > hour + 1) {
      slots.push({ id: `today-${w.from}`, day: "Today", window: w.window, label: `Today · ${w.window}` });
    }
  }
  for (const w of windows) {
    slots.push({
      id: `tomorrow-${w.from}`,
      day: "Tomorrow",
      window: w.window,
      label: `Tomorrow · ${w.window}`,
    });
  }
  return slots;
}

export type PaymentMethod = {
  id: string;
  label: string;
  hint: string;
  available: boolean;
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: "cod", label: "Cash on delivery", hint: "Pay the delivery partner", available: true },
  { id: "upi", label: "UPI", hint: "GPay, PhonePe, Paytm", available: false },
  { id: "card", label: "Credit / Debit card", hint: "Visa, Mastercard, RuPay", available: false },
  { id: "netbanking", label: "Net banking", hint: "All major banks", available: false },
  { id: "wallet", label: "Store wallet", hint: "Use your balance", available: false },
];

/** Short badge text for a coupon, e.g. "15% OFF", "₹100 OFF", "FREE SHIP". */
export function couponLabel(c: CouponRow): string {
  if (c.discount_type === "percent") return `${Number(c.discount_value)}% OFF`;
  if (c.discount_type === "free_shipping") return "FREE SHIP";
  return `₹${Number(c.discount_value)} OFF`;
}
