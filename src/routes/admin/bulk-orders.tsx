import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/bulk-orders")({
  component: () => <Navigate to="/admin/orders" />,
});
