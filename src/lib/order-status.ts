import type { OrderStatus } from "./types";

export const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-accent-soft text-accent-foreground",
  confirmed: "bg-primary-soft text-primary",
  packed: "bg-primary-soft text-primary",
  out_for_delivery: "bg-accent/25 text-accent-foreground",
  delivered: "bg-primary text-primary-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

export const STATUS_STEPS: OrderStatus[] = [
  "pending",
  "confirmed",
  "packed",
  "out_for_delivery",
  "delivered",
];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  packed: "Packed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const OPEN_ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "packed",
  "out_for_delivery",
];
