// lib/storage/index.ts
// Uploads to Vercel Blob in production, local disk in dev

import { put, del } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import {
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_VIDEO_UPLOAD_BYTES,
  ALLOWED_IMAGE_UPLOAD_MIMES,
  ALLOWED_VIDEO_UPLOAD_MIMES,
} from "@/lib/media/upload-limits";
import {
  sniffImageMime,
  sniffVideoContainerMime,
} from "@/lib/media/image-sniff";
import { resolveVaultAttachment } from "@/lib/msg-vault/attachments";

export {
  POST_IMAGE_MAX_BYTES,
  ALLOWED_IMAGE_MIMES,
} from "@/lib/media/image-sniff";

export {
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_VIDEO_UPLOAD_BYTES,
  ALLOWED_IMAGE_UPLOAD_MIMES,
  ALLOWED_VIDEO_UPLOAD_MIMES,
} from "@/lib/media/upload-limits";

export const MAX_SIZE_BYTES = MAX_IMAGE_UPLOAD_BYTES;

async function resolveUploadImageMime(file: File): Promise<
  | { ok: true; mime: string }
  | { ok: false; error: string }
> {
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `Image must be under ${MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)} MB.`,
    };
  }
  if (file.type.startsWith("video/")) {
    return {
      ok: false,
      error:
        "Videos aren’t supported for profile or gallery uploads. Use JPG, PNG, WebP, or GIF, or attach videos from a post.",
    };
  }

  const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  if (sniffVideoContainerMime(head)) {
    return {
      ok: false,
      error:
        "That file looks like a video. Use an image (JPG, PNG, WebP, GIF) for profile or gallery uploads.",
    };
  }

  let mime = file.type.trim();
  if (!mime || mime === "application/octet-stream") {
    mime = sniffImageMime(head) ?? "";
  }

  if (!(ALLOWED_IMAGE_UPLOAD_MIMES as readonly string[]).includes(mime)) {
    return {
      ok: false,
      error:
        `Only JPG, PNG, WebP, and GIF images are allowed (max ${MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)} MB). HEIC and other formats often need to be exported as JPG first.`,
    };
  }

  return { ok: true, mime };
}

async function resolvePostAttachmentMime(file: File): Promise<
  | { ok: true; mime: string; kind: "image" | "video" }
  | { ok: false; error: string }
> {
  const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  const sniffedVideo = sniffVideoContainerMime(head);
  const sniffedImage = sniffImageMime(head);

  const rawType = file.type.trim();
  const wantsVideo = rawType.startsWith("video/") || sniffedVideo !== null;

  if (wantsVideo) {
    if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
      return {
        ok: false,
        error: `Video must be under ${MAX_VIDEO_UPLOAD_BYTES / (1024 * 1024)} MB.`,
      };
    }
    let mime = "";
    if (rawType.startsWith("video/") && (ALLOWED_VIDEO_UPLOAD_MIMES as readonly string[]).includes(rawType)) {
      mime = rawType;
    } else if (sniffedVideo && (ALLOWED_VIDEO_UPLOAD_MIMES as readonly string[]).includes(sniffedVideo)) {
      mime = sniffedVideo;
    } else if (rawType.startsWith("video/")) {
      mime = rawType;
    }
    if (!(ALLOWED_VIDEO_UPLOAD_MIMES as readonly string[]).includes(mime)) {
      return {
        ok: false,
        error: "Only MP4, MOV, and WebM videos are allowed.",
      };
    }
    return { ok: true, mime, kind: "video" };
  }

  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `Image must be under ${MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)} MB.`,
    };
  }

  let mime = rawType;
  if (!mime || mime === "application/octet-stream") {
    mime = sniffedImage ?? "";
  }

  if (!(ALLOWED_IMAGE_UPLOAD_MIMES as readonly string[]).includes(mime)) {
    return {
      ok: false,
      error:
        `Only JPG, PNG, WebP, GIF images (max ${MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)} MB) or MP4/MOV/WebM videos (max ${MAX_VIDEO_UPLOAD_BYTES / (1024 * 1024)} MB).`,
    };
  }

  return { ok: true, mime, kind: "image" };
}

function extensionForImageMime(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "jpg";
}

function extensionForVideoMime(mimeType: string): string {
  if (mimeType === "video/quicktime") return "mov";
  if (mimeType === "video/webm") return "webm";
  return "mp4";
}

// ── Validate file (API routes can call before other logic) ────────────────────
export async function validateImage(file: File): Promise<string | null> {
  const r = await resolveUploadImageMime(file);
  return r.ok ? null : r.error;
}

// ── Upload — returns the public URL ──────────────────────────────────────────
function extensionForDocMime(mimeType: string): string {
  return mimeType === "application/pdf" ? "pdf" : "bin";
}

export async function uploadFile(
  file: File,
  folder: "profile" | "cover" | "gallery" | "post" | "msg-vault",
  filename: string,
): Promise<string> {
  let mime: string;
  let ext: string;

  if (folder === "msg-vault") {
    const r = await resolveVaultAttachment(file);
    if (!r.ok) throw new Error(`INVALID_IMAGE:${r.error}`);
    mime = r.attachment.mimeType;
    if (r.attachment.kind === "video") ext = extensionForVideoMime(mime);
    else if (r.attachment.kind === "document") ext = extensionForDocMime(mime);
    else ext = extensionForImageMime(mime);
  } else if (folder === "post") {
    const r = await resolvePostAttachmentMime(file);
    if (!r.ok) throw new Error(`INVALID_IMAGE:${r.error}`);
    mime = r.mime;
    ext = r.kind === "video" ? extensionForVideoMime(mime) : extensionForImageMime(mime);
  } else {
    const r = await resolveUploadImageMime(file);
    if (!r.ok) throw new Error(`INVALID_IMAGE:${r.error}`);
    mime = r.mime;
    ext = extensionForImageMime(mime);
  }

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
