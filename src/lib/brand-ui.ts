const BRAND_GRADIENTS = [
  "from-emerald-600 to-teal-700",
  "from-amber-500 to-orange-600",
  "from-violet-600 to-purple-700",
  "from-sky-600 to-blue-700",
  "from-rose-500 to-pink-600",
  "from-lime-600 to-green-700",
  "from-cyan-600 to-teal-700",
  "from-fuchsia-600 to-purple-700",
] as const;

export function brandGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash + name.charCodeAt(i) * (i + 1)) % BRAND_GRADIENTS.length;
  }
  return BRAND_GRADIENTS[hash];
}

export function brandInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** Prefer logo; ignore generic banner strips on compact brand cards. */
export function brandCardImage(logo?: string | null, banner?: string | null) {
  if (logo?.trim()) return { type: "logo" as const, src: logo.trim() };
  if (banner?.trim()) return { type: "banner" as const, src: banner.trim() };
  return { type: "none" as const, src: null };
}
