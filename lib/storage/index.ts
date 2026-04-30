// lib/storage/index.ts
// Uploads to Vercel Blob in production, local disk in dev

import { put, del } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function extensionFor(mimeType: string): string {
  if (mimeType === "image/png")  return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

// ── Validate file ─────────────────────────────────────────────────────────────
export function validateImage(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return "Only JPG, PNG, and WebP images are allowed";
  if (file.size > MAX_SIZE_BYTES)         return "Image must be under 5 MB";
  return null;
}

// ── Upload — returns the public URL ──────────────────────────────────────────
export async function uploadFile(
  file: File,
  folder: "profile" | "cover" | "gallery" | "post",
  filename: string,
): Promise<string> {
  const ext   = extensionFor(file.type);
  const key   = `${folder}/${filename}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    // ── Production: Vercel Blob ──────────────────────────────────────────────
    const blob = await put(key, bytes, {
      access: "public",
      contentType: file.type,
    });
    return blob.url;
  } else {
    // ── Dev fallback: local public/uploads ───────────────────────────────────
    const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, `${filename}.${ext}`), bytes);
    return `/uploads/${folder}/${filename}.${ext}`;
  }
}

// ── Delete — removes from Vercel Blob (no-op for local dev) ──────────────────
export async function deleteFile(url: string): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return; // local dev — skip
  if (!url.startsWith("http")) return;             // local path — skip
  try {
    await del(url);
  } catch {
    // non-fatal — blob may already be deleted
  }
}
