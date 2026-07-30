import { createServerFn } from "@tanstack/react-start";
import { getPublicSupabase } from "./catalog.server";

export const getStoreLocations = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getPublicSupabase();
  const { data, error } = await supabase
    .from("store_locations")
    .select(
      "id, name, address_text, city, state, pincode, latitude, longitude, phone, opening_hours, delivery_radius_km, is_active",
    )
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
});
