/** True when the email is a phone-login placeholder (not a real inbox). */
export function isInternalPhoneEmail(email: string | null | undefined) {
  if (!email) return false;
  return /^p\d{10}@phone\.mnxstore\.in$/i.test(email.trim());
}

/** Returns a display-safe email (empty string for internal phone placeholders). */
export function displayEmail(email: string | null | undefined) {
  if (!email || isInternalPhoneEmail(email)) return "";
  return email;
}
