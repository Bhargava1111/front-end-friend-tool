import { supabase } from "@/integrations/supabase/client";

export const MEDIA_BUCKET = "media";

export type MediaFolder =
  | "banners"
  | "brands"
  | "coupons"
  | "categories"
  | "products"
  | "variants"
  | "misc";

/** ~10 years — the media bucket is private, so we store a long-lived signed URL. */
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/avif", "image/gif", "image/svg+xml"];

function slugifyName(name: string) {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : "jpg";
  return `${base || "image"}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
}

export function validateImageFile(file: File) {
  if (!ALLOWED.includes(file.type)) {
    return "Use a PNG, JPG, WEBP, AVIF, GIF or SVG image.";
  }
  if (file.size > MAX_BYTES) {
    return "Image must be smaller than 8 MB.";
  }
  return null;
}

/** Uploads an image to the private media bucket and returns a long-lived signed URL. */
export async function uploadMedia(file: File, folder: MediaFolder = "misc") {
  const problem = validateImageFile(file);
  if (problem) throw new Error(problem);

  const path = `${folder}/${slugifyName(file.name)}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(error.message);

  const { data, error: signError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (signError || !data?.signedUrl) {
    throw new Error(signError?.message ?? "Could not create a URL for the uploaded image.");
  }
  return { url: data.signedUrl, path };
}
