// Shared browser-side photo ingest: HEIC convert, resize, and direct upload
// to storage with progress. Used by the service form; the product upload
// widget keeps its own multi-photo variant.

import { getBrowserId } from "@/lib/browser-id";
import { createUploadTicket, signUploadedOriginal } from "@/lib/cowq.functions";

export async function convertHeicIfNeeded(file: File): Promise<Blob> {
  const isHeic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  if (!isHeic) return file;
  const mod = await import("heic2any");
  const out = await mod.default({ blob: file, toType: "image/jpeg", quality: 0.9 });
  return Array.isArray(out) ? out[0] : out;
}

export async function shrinkToJpeg(blob: Blob, maxSide = 1600, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not compress image"))),
      "image/jpeg",
      quality,
    );
  });
}

function putWithProgress(url: string, blob: Blob, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", blob.type || "image/jpeg");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Network error while uploading"));
    xhr.send(blob);
  });
}

/** Compress and upload one photo. Returns a signed URL plus a local preview. */
export async function uploadOnePhoto(
  file: File,
  onProgress: (pct: number) => void,
): Promise<{ url: string; previewUrl: string }> {
  const converted = await convertHeicIfNeeded(file);
  const compressed = await shrinkToJpeg(converted);
  const browserId = getBrowserId();
  const ticket = await createUploadTicket({ data: { browserId, ext: "jpg" } });
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  const putUrl = `${base}/storage/v1/object/upload/sign/${ticket.bucket}/${ticket.path}?token=${encodeURIComponent(ticket.token)}`;
  await putWithProgress(putUrl, compressed, onProgress);
  const { url } = await signUploadedOriginal({ data: { path: ticket.path } });
  return { url, previewUrl: URL.createObjectURL(compressed) };
}
