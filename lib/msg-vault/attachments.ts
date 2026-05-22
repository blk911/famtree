// Msg Vault — governed attachment upload validation (Agent 109).

import {
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_VIDEO_UPLOAD_BYTES,
} from "@/lib/media/upload-limits";
import {
  sniffImageMime,
  sniffVideoContainerMime,
} from "@/lib/media/image-sniff";
import type { MsgAttachmentDTO, MsgAttachmentKind } from "@/types/msg-vault/attachment";
import { MsgAttachmentKind as Kind } from "@/types/msg-vault/attachment";

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
const VIDEO_MIMES = ["video/mp4"] as const;
const DOC_MIMES = ["application/pdf"] as const;
const MAX_DOC_BYTES = 10 * 1024 * 1024;

export const MSG_VAULT_ATTACHMENT_ACCEPT =
  "image/jpeg,image/png,image/webp,video/mp4,application/pdf,.jpg,.jpeg,.png,.webp,.mp4,.pdf";

export async function resolveVaultAttachment(
  file: File,
): Promise<{ ok: true; attachment: Omit<MsgAttachmentDTO, "url"> } | { ok: false; error: string }> {
  const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  const sniffedVideo = sniffVideoContainerMime(head);
  const sniffedImage = sniffImageMime(head);
  const rawType = file.type.trim();

  if (rawType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    if (file.size > MAX_DOC_BYTES) {
      return { ok: false, error: "PDF must be under 10 MB." };
    }
    return {
      ok: true,
      attachment: {
        kind: Kind.DOCUMENT,
        fileName: file.name || "document.pdf",
        mimeType: "application/pdf",
        byteSize: file.size,
      },
    };
  }

  const wantsVideo = rawType.startsWith("video/") || sniffedVideo !== null;
  if (wantsVideo) {
    if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
      return {
        ok: false,
        error: `Video must be under ${MAX_VIDEO_UPLOAD_BYTES / (1024 * 1024)} MB.`,
      };
    }
    const mime =
      VIDEO_MIMES.find((m) => m === rawType) ??
      (sniffedVideo === "video/mp4" ? "video/mp4" : null);
    if (!mime) {
      return { ok: false, error: "Only MP4 video is supported in Msg Vault." };
    }
    return {
      ok: true,
      attachment: {
        kind: Kind.VIDEO,
        fileName: file.name || "video.mp4",
        mimeType: mime,
        byteSize: file.size,
      },
    };
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
  if (!(IMAGE_MIMES as readonly string[]).includes(mime)) {
    return {
      ok: false,
      error: "Only JPG, PNG, and WebP images are allowed.",
    };
  }

  return {
    ok: true,
    attachment: {
      kind: Kind.IMAGE,
      fileName: file.name || "image.jpg",
      mimeType: mime,
      byteSize: file.size,
    },
  };
}

export function parseAttachmentsJson(value: unknown): MsgAttachmentDTO[] {
  if (!Array.isArray(value)) return [];
  const out: MsgAttachmentDTO[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const kind = row.kind as MsgAttachmentKind;
    const url = typeof row.url === "string" ? row.url : "";
    if (!url || !["image", "video", "document"].includes(kind)) continue;
    out.push({
      kind,
      url,
      fileName: typeof row.fileName === "string" ? row.fileName : "file",
      mimeType: typeof row.mimeType === "string" ? row.mimeType : "application/octet-stream",
      byteSize: typeof row.byteSize === "number" ? row.byteSize : 0,
    });
  }
  return out;
}
