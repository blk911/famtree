"use client";

import { upload } from "@vercel/blob/client";
import { BLOB_CLIENT_MULTIPART_THRESHOLD_BYTES } from "@/lib/media/upload-limits";

/** Extension for Blob pathname (storage key); aligns with server `uploadFile` rules. */
export function extensionForPostUploadFile(file: File): string {
  const n = file.name.toLowerCase();
  const t = file.type;
  if (n.endsWith(".webm") || t === "video/webm") return "webm";
  if (n.endsWith(".mov") || t === "video/quicktime") return "mov";
  if (n.endsWith(".mp4") || t === "video/mp4") return "mp4";
  if (n.endsWith(".gif") || t === "image/gif") return "gif";
  if (n.endsWith(".webp") || t === "image/webp") return "webp";
  if (n.endsWith(".png") || t === "image/png") return "png";
  return "jpg";
}

export type PreparedPostMedia =
  | { kind: "multipart"; file: File }
  | { kind: "blob"; url: string };

/**
 * When `BLOB_READ_WRITE_TOKEN` is set (prod Vercel Blob), uploads bytes directly from the browser to Blob,
 * avoiding platform request-body limits on `/api/profile/posts`. Otherwise returns the file for multipart POST.
 */
export async function preparePostMediaForSubmit(file: File): Promise<PreparedPostMedia> {
  const capsRes = await fetch("/api/profile/posts/media-capabilities", { credentials: "same-origin" });
  if (!capsRes.ok) {
    throw new Error("Could not read upload configuration.");
  }
  const caps = (await capsRes.json()) as { blobClientUpload?: boolean };

  if (!caps.blobClientUpload) {
    return { kind: "multipart", file };
  }

  const pathname = `post/${crypto.randomUUID()}.${extensionForPostUploadFile(file)}`;
  const blob = await upload(pathname, file, {
    access: "public",
    handleUploadUrl: `${window.location.origin}/api/profile/posts/blob-upload`,
    contentType: file.type || undefined,
    multipart: file.size >= BLOB_CLIENT_MULTIPART_THRESHOLD_BYTES,
  });

  return { kind: "blob", url: blob.url };
}
