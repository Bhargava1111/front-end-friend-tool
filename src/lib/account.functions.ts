import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/integrations/django/auth-middleware";
import { apiFetch, toJsonBody } from "@/lib/api";
import { adminFetch } from "@/lib/admin-api";
import { isValidLocalPhone, toE164Phone, toLocalPhoneDigits } from "@/lib/phone-utils";

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

export const getMyVerification = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    return apiFetch<AccountVerification>("/account/verification/", { token: context.accessToken });
  });

export const submitVerification = createServerFn({ method: "POST" })
  .middleware([requireAuth])
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
    const phone = toLocalPhoneDigits(data.phone);
    const address = data.address_text.trim();
    const pincode = data.pincode.replace(/\D/g, "");

    if (name.length < 3) throw new Error("Enter your full name");
    if (!isValidLocalPhone(phone)) throw new Error("Enter a valid 10-digit mobile number");
    if (address.length < 10) throw new Error("Enter your complete delivery address");
    if (pincode.length !== 6) throw new Error("Enter a valid 6-digit pincode");
    if (data.latitude == null || data.longitude == null) {
      throw new Error("Confirm your location on the map before submitting");
    }

    return apiFetch("/account/verification/", {
      method: "POST",
      token: context.accessToken,
      body: toJsonBody({
        ...data,
        full_name: name,
        phone: toE164Phone(phone),
        address_text: address,
        pincode,
      }),
    });
  });
