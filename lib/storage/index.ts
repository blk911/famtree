// lib/storage/index.ts
// Uploads to Cloudflare R2 in production, local disk in dev
// R2 is S3-compatible — uses @aws-sdk/client-s3

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// ── R2 client (lazy — only created if env vars are present) ──────────────────
function getR2(): S3Client | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) return null;
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

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

  const r2 = getR2();

  if (r2) {
    // ── Production: write to R2 ──────────────────────────────────────────────
    const bucket = process.env.R2_BUCKET_NAME!;
    await r2.send(new PutObjectCommand({
      Bucket:      bucket,
      Key:         key,
      Body:        bytes,
      ContentType: file.type,
    }));

    // Public URL — either custom domain or R2 dev URL
    const base = process.env.R2_PUBLIC_URL!; // e.g. https://assets.yourdomain.com
    return `${base}/${key}`;
  } else {
    // ── Dev fallback: write to public/uploads ────────────────────────────────
    const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, `${filename}.${ext}`), bytes);
    return `/uploads/${folder}/${filename}.${ext}`;
  }
}

// ── Delete — removes from R2 (no-op for local dev) ───────────────────────────
export async function deleteFile(url: string): Promise<void> {
  const r2     = getR2();
  const bucket = process.env.R2_BUCKET_NAME;
  const base   = process.env.R2_PUBLIC_URL;
  if (!r2 || !bucket || !base) return; // local dev — skip
  const key = url.replace(`${base}/`, "");
  await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
