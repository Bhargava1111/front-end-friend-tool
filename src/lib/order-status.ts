import type { OrderStatus } from "./types";

export const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-accent-soft text-accent-foreground",
  confirmed: "bg-primary-soft text-primary",
  packed: "bg-primary-soft text-primary",
  delivered: "bg-primary text-primary-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

export const STATUS_STEPS: OrderStatus[] = ["pending", "confirmed", "packed", "delivered"];
