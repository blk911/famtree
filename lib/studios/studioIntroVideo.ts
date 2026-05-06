/**
 * Hero intro + testimonial clips under `public/uploads/`.
 * Whitelist filenames in `.gitignore` when committing binaries.
 */

/** Filename only — must match disk exactly under `public/uploads/`. */
export const STUDIO_INTRO_VIDEO_FILENAME =
  "Studios_Relationship-Based_Business_720p_caption.mp4";

/** Repo-relative path — cinema error UI + docs (must stay aligned with STUDIO_INTRO_VIDEO_FILENAME). */
export const STUDIO_INTRO_VIDEO_EXPECTED_PATH =
  `public/uploads/${STUDIO_INTRO_VIDEO_FILENAME}`;

/**
 * URL path for `<video src>` — encode spaces only.
 * (Full `encodeURIComponent` is unnecessary here and matches Next static file routing.)
 */
export const STUDIO_INTRO_VIDEO_SRC =
  `/uploads/${STUDIO_INTRO_VIDEO_FILENAME.replace(/ /g, "%20")}`;

/** Seek hint helps browsers paint the first frame as thumbnail (`preload="metadata"`). */
export const STUDIO_INTRO_VIDEO_THUMB_SRC = `${STUDIO_INTRO_VIDEO_SRC}#t=0.001`;

/** HeyGen community testimonial — whitelist in `.gitignore` under `public/uploads/*`. */
export const HAILEY_COMMUNITY_TESTIMONIAL_VIDEO_SRC =
  "/uploads/Hailey%27s%20Community%20Testimonial_720p_caption.mp4";

export const HAILEY_COMMUNITY_TESTIMONIAL_VIDEO_THUMB_SRC =
  `${HAILEY_COMMUNITY_TESTIMONIAL_VIDEO_SRC}#t=0.001`;
