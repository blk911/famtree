/** Browser + Node safe image sniffing (magic bytes). No fs / Blob SDK deps. */

export const POST_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

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

/** Quick video sniff — MP4/MOV family (ftyp). */
export function sniffVideoMime(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  // ....ftyp at offset 4
  return (
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  );
}

export async function checkBrowserImageFile(
  file: File,
): Promise<{ ok: true; mime: string } | { ok: false; error: string }> {
  if (file.size > POST_IMAGE_MAX_BYTES) {
    return { ok: false, error: "Image must be under 5 MB." };
  }
  if (file.type.startsWith("video/")) {
    return {
      ok: false,
      error:
        "Video files aren’t supported as attachments yet. Use a photo (JPG, PNG, WebP, or GIF), paste an image URL, or put a video link in your post text.",
    };
  }

  const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  if (sniffVideoMime(head)) {
    return {
      ok: false,
      error:
        "That file looks like a video. Attach a photo instead (JPG, PNG, WebP, GIF), or paste a link.",
    };
  }

  let mime = file.type.trim();
  if (!mime || mime === "application/octet-stream") {
    mime = sniffImageMime(head) ?? "";
  }

  if (!ALLOWED_IMAGE_MIMES.includes(mime as (typeof ALLOWED_IMAGE_MIMES)[number])) {
    return {
      ok: false,
      error:
        "Use a JPG, PNG, WebP, or GIF image (max 5 MB). iPhone HEIC often fails in browsers — export as JPG if needed.",
    };
  }

  return { ok: true, mime };
}
