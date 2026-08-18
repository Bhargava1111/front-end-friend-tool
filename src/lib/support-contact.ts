import { env } from "@/lib/env";

/** Store support contact — used for tel:, mailto: and WhatsApp links. */
const raw = env.supportPhone.replace(/\D/g, "");
const local = raw.length > 10 ? raw.slice(-10) : raw;
export const SUPPORT_PHONE_DISPLAY = `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
export const SUPPORT_PHONE_RAW = local;
export const SUPPORT_PHONE_E164 = `+91${local}`;
export const SUPPORT_TEL_HREF = `tel:${SUPPORT_PHONE_E164}`;
export const SUPPORT_WHATSAPP_HREF = `${env.whatsappBaseUrl}/91${local}`;
export const SUPPORT_EMAIL = env.supportEmail;
export const SUPPORT_MAILTO_HREF = `mailto:${SUPPORT_EMAIL}`;

/** Normalize any phone string to digits for tel:/wa.me links. */
export function phoneHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  return local.length === 10 ? `tel:+91${local}` : `tel:${phone.replace(/\s/g, "")}`;
}

export function whatsappHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  return local.length === 10 ? `${env.whatsappBaseUrl}/91${local}` : `${env.whatsappBaseUrl}/${digits}`;
}
