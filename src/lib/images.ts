"use client";

import { createClient } from "./supabase/client";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/**
 * Shrink a screenshot so it uploads fast on a phone: longest side 1800px, WebP.
 * Charts stay sharp at this size. Falls back to the original file if the browser can't convert.
 */
export async function shrinkImage(file: Blob, maxSide = 1800, quality = 0.86): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("That isn't an image. Pick a PNG or JPG screenshot.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("That image is too big (over 15 MB).");
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const out = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", quality));
    return out && out.size < file.size ? out : file;
  } catch {
    return file;
  }
}

/** Upload to the private "screenshots" bucket under the user's own folder. Returns the storage path. */
export async function uploadScreenshot(userId: string, tradeId: string, file: Blob): Promise<string> {
  const small = await shrinkImage(file);
  const ext = small.type === "image/webp" ? "webp" : small.type === "image/png" ? "png" : "jpg";
  const path = `${userId}/${tradeId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await createClient()
    .storage.from("screenshots")
    .upload(path, small, { contentType: small.type || "image/png", upsert: false });
  if (error) throw new Error("Upload failed. Check your connection and try again.");
  return path;
}

/** Pull the first image out of a paste event (Ctrl+V / Cmd+V). */
export function imageFromPaste(e: ClipboardEvent): File | null {
  const items = e.clipboardData?.items;
  if (!items) return null;
  for (const item of Array.from(items)) {
    if (item.kind === "file" && item.type.startsWith("image/")) return item.getAsFile();
  }
  return null;
}
