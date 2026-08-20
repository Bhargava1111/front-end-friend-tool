import { ensureValidAccessToken } from "@/lib/auth-session";
import { getApiBase } from "@/lib/api";
import { getAdminPanelToken } from "@/lib/admin-session";

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
const COMPRESS_OVER_BYTES = 350 * 1024;
const MAX_EDGE = 1920;
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

async function prepareImageForUpload(file: File): Promise<File> {
  if (
    typeof createImageBitmap !== "function" ||
    !file.type.startsWith("image/") ||
    file.type === "image/gif" ||
    file.type === "image/svg+xml" ||
    file.type === "image/avif"
  ) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const shouldResize = scale < 1;
  const shouldCompress = file.size > COMPRESS_OVER_BYTES;
  if (!shouldResize && !shouldCompress) {
    bitmap.close();
    return file;
  }

  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.82),
  );
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
}

/** Uploads an image via the Django media endpoint and returns the public URL. */
export async function uploadMedia(file: File, folder: MediaFolder = "misc") {
  const prepared = await prepareImageForUpload(file);
  const problem = validateImageFile(prepared);
  if (problem) throw new Error(problem);

  const token = await ensureValidAccessToken();
  if (!token) throw new Error("Sign in to upload images.");

  const form = new FormData();
  form.append("file", prepared);
  form.append("folder", folder);

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const adminSession = getAdminPanelToken();
  if (adminSession) headers["X-Admin-Session"] = adminSession;

  const res = await fetch(`${getApiBase()}/media/`, {
    method: "POST",
    headers,
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? "Upload failed.");
  }

  const data = (await res.json()) as { url: string; path: string };
  return { url: data.url, path: data.path };
}
