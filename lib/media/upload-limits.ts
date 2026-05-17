/** Central upload limits for posts, feeds, and profile-style image uploads.
 *
 * Hosting note: multipart bodies must fit your runtime and reverse-proxy limits (e.g.
 * `client_max_body_size`). These constants define application-side validation only.
 */

export const MAX_IMAGE_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MAX_VIDEO_UPLOAD_BYTES = 75 * 1024 * 1024;

/** Raster images accepted for posts/feeds and profile-style uploads. */
export const ALLOWED_IMAGE_UPLOAD_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/** Short consumer-grade clips — MP4, MOV (QuickTime), WebM. */
export const ALLOWED_VIDEO_UPLOAD_MIMES = ["video/mp4", "video/quicktime", "video/webm"] as const;

/** @deprecated Prefer MAX_IMAGE_UPLOAD_BYTES — kept for legacy imports. */
export const POST_IMAGE_MAX_BYTES = MAX_IMAGE_UPLOAD_BYTES;

/** HTML file input `accept` for post/feed composers (images + videos). */
export const BROWSER_POST_MEDIA_ACCEPT =
  "image/jpeg,image/jpg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm";

const VIDEO_EXT = /\.(mp4|mov|webm)(\?|#|$)/i;

/** Best-effort: treat stored attachment URLs as video for inline playback. */
export function isVideoAttachmentUrl(url: string): boolean {
  try {
    const u = new URL(url, "https://dummy.local");
    return VIDEO_EXT.test(u.pathname);
  } catch {
    return VIDEO_EXT.test(url);
  }
}
