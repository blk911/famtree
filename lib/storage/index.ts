// lib/storage/index.ts
// Uploads to Vercel Blob in production, local disk in dev

import { put, del } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import {
  POST_IMAGE_MAX_BYTES,
  sniffImageMime,
  sniffVideoMime,
  ALLOWED_IMAGE_MIMES,
} from "@/lib/media/image-sniff";

export { POST_IMAGE_MAX_BYTES, ALLOWED_IMAGE_MIMES } from "@/lib/media/image-sniff";

export const MAX_SIZE_BYTES = POST_IMAGE_MAX_BYTES;

async function resolveUploadImageMime(file: File): Promise<
  | { ok: true; mime: string }
  | { ok: false; error: string }
> {
  if (file.size > POST_IMAGE_MAX_BYTES) {
    return { ok: false, error: "Image must be under 5 MB." };
  }
  if (file.type.startsWith("video/")) {
    return {
      ok: false,
      error:
        "Videos aren’t supported as attachments yet. Use JPG, PNG, WebP, or GIF (under 5 MB), or paste a link.",
    };
  }

  const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  if (sniffVideoMime(head)) {
    return {
      ok: false,
      error:
        "That file looks like a video. Attach an image (JPG, PNG, WebP, GIF) or paste a link instead.",
    };
  }

  let mime = file.type.trim();
  if (!mime || mime === "application/octet-stream") {
    mime = sniffImageMime(head) ?? "";
  }

  if (!(ALLOWED_IMAGE_MIMES as readonly string[]).includes(mime)) {
    return {
      ok: false,
      error:
        "Only JPG, PNG, WebP, and GIF images are allowed (max 5 MB). HEIC and other formats often need to be exported as JPG first.",
    };
  }

  return { ok: true, mime };
}

function extensionFor(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "jpg";
}

// ── Validate file (API routes can call before other logic) ────────────────────
export async function validateImage(file: File): Promise<string | null> {
  const r = await resolveUploadImageMime(file);
  return r.ok ? null : r.error;
}

// ── Upload — returns the public URL ──────────────────────────────────────────
export async function uploadFile(
  file: File,
  folder: "profile" | "cover" | "gallery" | "post",
  filename: string,
): Promise<string> {
  const r = await resolveUploadImageMime(file);
  if (!r.ok) throw new Error(`INVALID_IMAGE:${r.error}`);
  const mime = r.mime;
  const ext = extensionFor(mime);
  const key = `${folder}/${filename}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(key, bytes, {
      access: "public",
      contentType: mime,
    });
    return blob.url;
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, `${filename}.${ext}`), bytes);
  return `/uploads/${folder}/${filename}.${ext}`;
}

// ── Delete — removes from Vercel Blob (no-op for local dev) ──────────────────
export async function deleteFile(url: string): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  if (!url.startsWith("http")) return;
  try {
    await del(url);
  } catch {
    // non-fatal
  }
}
