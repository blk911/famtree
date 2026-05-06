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

/** Right-column hero clip (`StudioHeroHaileyTestimonial`). Filename must match `public/uploads/`. */
export const STUDIOS_COMMUNITY_CLIP_FILENAME = "studio_3.mp4";

export const STUDIOS_COMMUNITY_CLIP_EXPECTED_PATH =
  `public/uploads/${STUDIOS_COMMUNITY_CLIP_FILENAME}`;

export const STUDIOS_COMMUNITY_CLIP_SRC =
  `/uploads/${STUDIOS_COMMUNITY_CLIP_FILENAME.replace(/ /g, "%20")}`;

export const STUDIOS_COMMUNITY_CLIP_THUMB_SRC =
  `${STUDIOS_COMMUNITY_CLIP_SRC}#t=0.001`;

/** Legacy names — same URLs as `STUDIOS_COMMUNITY_CLIP_*`. */
export const HAILEY_COMMUNITY_TESTIMONIAL_VIDEO_SRC = STUDIOS_COMMUNITY_CLIP_SRC;

export const HAILEY_COMMUNITY_TESTIMONIAL_VIDEO_THUMB_SRC =
  STUDIOS_COMMUNITY_CLIP_THUMB_SRC;

/** Private Client Feedback card 1 — `Testimony 1.mp4` under `public/uploads/`. */
export const STUDIO_TESTIMONY_FEEDBACK_1_FILENAME = "Testimony 1.mp4";

export const STUDIO_TESTIMONY_FEEDBACK_1_EXPECTED_PATH =
  `public/uploads/${STUDIO_TESTIMONY_FEEDBACK_1_FILENAME}`;

export const STUDIO_TESTIMONY_FEEDBACK_1_SRC =
  `/uploads/${STUDIO_TESTIMONY_FEEDBACK_1_FILENAME.replace(/ /g, "%20")}`;

export const STUDIO_TESTIMONY_FEEDBACK_1_THUMB_SRC = `${STUDIO_TESTIMONY_FEEDBACK_1_SRC}#t=0.001`;
