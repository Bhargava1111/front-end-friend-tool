import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "@/lib/api";

export const getStoreLocations = createServerFn({ method: "GET" }).handler(async () => {
  return apiFetch("/stores/");
});
