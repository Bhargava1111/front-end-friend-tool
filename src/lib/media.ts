import { ensureValidAccessToken } from "@/lib/auth-session";
import { getApiBase } from "@/lib/api";

export type MediaFolder =
  | "banners"
  | "brands"
  | "coupons"
  | "categories"
  | "products"
  | "variants"
  | "avatars"
  | "misc";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/avif", "image/gif", "image/svg+xml"];

export function validateImageFile(file: File) {
  if (!ALLOWED.includes(file.type)) {
    return "Use a PNG, JPG, WEBP, AVIF, GIF or SVG image.";
  }
  if (file.size > MAX_BYTES) {
    return "Image must be smaller than 8 MB.";
  }
  return null;
}

/** Uploads an image via the Django media endpoint and returns the public URL. */
export async function uploadMedia(file: File, folder: MediaFolder = "misc") {
  const problem = validateImageFile(file);
  if (problem) throw new Error(problem);

  const token = await ensureValidAccessToken();
  if (!token) throw new Error("Sign in to upload images.");

  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);

  const res = await fetch(`${getApiBase()}/media/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? "Upload failed.");
  }

  const data = (await res.json()) as { url: string; path: string };
  return { url: data.url, path: data.path };
}
