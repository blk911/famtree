/** Browser + Node safe image/video sniffing (magic bytes). No fs / Blob SDK deps. */

import {
  ALLOWED_IMAGE_UPLOAD_MIMES,
  ALLOWED_VIDEO_UPLOAD_MIMES,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_VIDEO_UPLOAD_BYTES,
} from "@/lib/media/upload-limits";

export { POST_IMAGE_MAX_BYTES } from "@/lib/media/upload-limits";

export const ALLOWED_IMAGE_MIMES = ALLOWED_IMAGE_UPLOAD_MIMES;

export const ALLOWED_VIDEO_MIMES = ALLOWED_VIDEO_UPLOAD_MIMES;

/** Detect image MIME from first bytes; returns null if not a supported raster image. */
export function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  // PNG
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  // GIF GIF87a / GIF89a
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return "image/gif";
  }
  // WebP (RIFF .... WEBP)
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

/** ISO BMFF / QuickTime — `....ftyp` at offset 4. */
export function sniffVideoMime(bytes: Uint8Array): boolean {
  return sniffVideoContainerMime(bytes) !== null;
}

/** MP4/MOV/WebM container sniff → canonical MIME for allowed upload types. */
export function sniffVideoContainerMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  // MP4 / MOV family
  if (
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    const b8 = bytes[8];
    const b9 = bytes[9];
    const b10 = bytes[10];
    const b11 = bytes[11];
    const brand =
      String.fromCharCode(b8, b9, b10, b11);
    if (brand === "qt  " || brand === "M4V " || brand === "M4A ") {
      return "video/quicktime";
    }
    return "video/mp4";
  }
  // WebM / Matroska (EBML)
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return "video/webm";
  }
  return null;
}

export async function checkBrowserImageFile(
  file: File,
): Promise<{ ok: true; mime: string } | { ok: false; error: string }> {
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return { ok: false, error: `Image must be under ${MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)} MB.` };
  }
  if (file.type.startsWith("video/")) {
    return {
      ok: false,
      error:
        "That file is a video. For posts, pick the video again from Attach — or use a JPG, PNG, WebP, or GIF photo.",
    };
  }

  const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  if (sniffVideoContainerMime(head)) {
    return {
      ok: false,
      error:
        "That file looks like a video. Use Attach and choose a video, or attach a photo (JPG, PNG, WebP, GIF).",
    };
  }

  let mime = file.type.trim();
  if (!mime || mime === "application/octet-stream") {
    mime = sniffImageMime(head) ?? "";
  }

  if (!ALLOWED_IMAGE_UPLOAD_MIMES.includes(mime as (typeof ALLOWED_IMAGE_UPLOAD_MIMES)[number])) {
    return {
      ok: false,
      error:
        `Use a JPG, PNG, WebP, or GIF image (max ${MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)} MB). iPhone HEIC often fails in browsers — export as JPG if needed.`,
    };
  }

  return { ok: true, mime };
}

/** Post / feed attachment: image (≤15 MB) or MP4/MOV/WebM (≤75 MB). */
export async function checkBrowserPostMediaFile(
  file: File,
): Promise<
  { ok: true; mime: string; kind: "image" | "video" } | { ok: false; error: string }
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
    if (
      rawType.startsWith("video/") &&
      (ALLOWED_VIDEO_UPLOAD_MIMES as readonly string[]).includes(rawType)
    ) {
      mime = rawType;
    } else if (
      sniffedVideo &&
      (ALLOWED_VIDEO_UPLOAD_MIMES as readonly string[]).includes(sniffedVideo)
    ) {
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

  if (!ALLOWED_IMAGE_UPLOAD_MIMES.includes(mime as (typeof ALLOWED_IMAGE_UPLOAD_MIMES)[number])) {
    return {
      ok: false,
      error:
        `Use a JPG, PNG, WebP, or GIF image (max ${MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)} MB), or an MP4/MOV/WebM video (max ${MAX_VIDEO_UPLOAD_BYTES / (1024 * 1024)} MB).`,
    };
  }

  return { ok: true, mime, kind: "image" };
}
