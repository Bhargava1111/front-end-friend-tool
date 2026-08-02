import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type VerificationStatus = "pending" | "submitted" | "verified" | "rejected";

export type AccountVerification = {
  id: string;
  full_name: string | null;
  phone: string | null;
  address_text: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  location_accuracy_m: number | null;
  verification_status: VerificationStatus;
  rejection_reason: string | null;
  submitted_at: string | null;
  verified_at: string | null;
};

const COLUMNS =
  "id, full_name, phone, address_text, pincode, latitude, longitude, location_accuracy_m, verification_status, rejection_reason, submitted_at, verified_at";

/** Reads the signed-in shopper's verification record, creating it lazily. */
export const getMyVerification = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select(COLUMNS)
      .eq("id", context.userId)
      .maybeSingle();
    if (data) return data as AccountVerification;
    await context.supabase.from("profiles").insert({ id: context.userId });
    const { data: created } = await context.supabase
      .from("profiles")
      .select(COLUMNS)
      .eq("id", context.userId)
      .maybeSingle();
    return (created ?? null) as AccountVerification | null;
  });

/** Shopper submits name, phone, address and a confirmed GPS pin for admin review. */
export const submitVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      full_name: string;
      phone: string;
      address_text: string;
      pincode: string;
      latitude: number | null;
      longitude: number | null;
      location_accuracy_m: number | null;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const name = data.full_name.trim();
    const phone = data.phone.replace(/\D/g, "");
    const address = data.address_text.trim();
    const pincode = data.pincode.replace(/\D/g, "");

    if (name.length < 3) throw new Error("Enter your full name");
    if (phone.length !== 10) throw new Error("Enter a valid 10-digit mobile number");
    if (address.length < 10) throw new Error("Enter your complete delivery address");
    if (pincode.length !== 6) throw new Error("Enter a valid 6-digit pincode");
    if (data.latitude == null || data.longitude == null) {
      throw new Error("Confirm your location on the map before submitting");
    }

    const { error } = await context.supabase
      .from("profiles")
      .update({
        full_name: name,
        phone,
        address_text: address,
        pincode,
        latitude: data.latitude,
        longitude: data.longitude,
        location_accuracy_m: data.location_accuracy_m,
        verification_status: "submitted",
        submitted_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
