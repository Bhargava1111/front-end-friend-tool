/** Last 10 digits of an Indian mobile number (strips +91 / country code). */
export function toLocalPhoneDigits(raw: string | null | undefined): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length <= 10) return digits;
  return digits.slice(-10);
}

export function isValidLocalPhone(raw: string | null | undefined): boolean {
  return toLocalPhoneDigits(raw).length === 10;
}

/** Store phones in E.164 (+91…) for the Django backend. */
export function toE164Phone(raw: string | null | undefined): string {
  const local = toLocalPhoneDigits(raw);
  return local ? `+91${local}` : "";
}
