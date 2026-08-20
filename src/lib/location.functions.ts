import { apiFetch } from "@/lib/api";

export async function getStoreLocations() {
  return apiFetch("/stores/");
}
