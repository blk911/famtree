/**
 * Hero intro + testimonial clips under `public/uploads/`.
 * Whitelist filenames in `.gitignore` when committing binaries.
 */

function uploadsVideoPaths(filename: string) {
  const expectedFileHint = `public/uploads/${filename}`;
  /** Encode path segments so spaces + punctuation survive proxies/CDNs; avoid naive space→%20 only. */
  const videoSrc = `/uploads/${filename.split("/").map((s) => encodeURIComponent(s)).join("/")}`;
  const thumbSrc = `${videoSrc}#t=0.001`;
  return { expectedFileHint, videoSrc, thumbSrc } as const;
}

/** Hero triad card 1 — Private Studio Network intro. */
export const HERO_PSN_INTRO_FILENAME = "Private_Studio_Network_Intro 1.mp4";
export const HERO_PSN_INTRO = uploadsVideoPaths(HERO_PSN_INTRO_FILENAME);

/** Hero triad card 2 — Private Client Network (business relationships). */
export const HERO_PSN_BUSINESS_FILENAME = "Private_Studio_Network_buasiness 1.mp4";
export const HERO_PSN_BUSINESS = uploadsVideoPaths(HERO_PSN_BUSINESS_FILENAME);

/** Hero triad card 3 — Family & Learning Spaces (education). */
export const HERO_PSN_EDUCATION_FILENAME = "Private_Studio_Network_Education 1.mp4";
export const HERO_PSN_EDUCATION = uploadsVideoPaths(HERO_PSN_EDUCATION_FILENAME);

/** Landing hero — featured right-column clip (single video; carousel strip removed). URL-safe name (no spaces). On disk: `public/uploads/studios-hero-intro-v2.mp4`. */
export const STUDIOS_LANDING_HERO_INTRO_FILENAME = "studios-hero-intro-v2.mp4";
export const STUDIOS_LANDING_HERO_INTRO = uploadsVideoPaths(STUDIOS_LANDING_HERO_INTRO_FILENAME);

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

/** Private Client Feedback card 2 — `Testimony 2.mp4` under `public/uploads/`. */
export const STUDIO_TESTIMONY_FEEDBACK_2_FILENAME = "Testimony 2.mp4";

export const STUDIO_TESTIMONY_FEEDBACK_2_EXPECTED_PATH =
  `public/uploads/${STUDIO_TESTIMONY_FEEDBACK_2_FILENAME}`;

export const STUDIO_TESTIMONY_FEEDBACK_2_SRC =
  `/uploads/${STUDIO_TESTIMONY_FEEDBACK_2_FILENAME.replace(/ /g, "%20")}`;

export const STUDIO_TESTIMONY_FEEDBACK_2_THUMB_SRC = `${STUDIO_TESTIMONY_FEEDBACK_2_SRC}#t=0.001`;

/** Private Client Feedback card 3 — `Testimony 3.mp4` under `public/uploads/`. */
export const STUDIO_TESTIMONY_FEEDBACK_3_FILENAME = "Testimony 3.mp4";

export const STUDIO_TESTIMONY_FEEDBACK_3_EXPECTED_PATH =
  `public/uploads/${STUDIO_TESTIMONY_FEEDBACK_3_FILENAME}`;

export const STUDIO_TESTIMONY_FEEDBACK_3_SRC =
  `/uploads/${STUDIO_TESTIMONY_FEEDBACK_3_FILENAME.replace(/ /g, "%20")}`;

export const STUDIO_TESTIMONY_FEEDBACK_3_THUMB_SRC = `${STUDIO_TESTIMONY_FEEDBACK_3_SRC}#t=0.001`;

/** Private Client Feedback card 4 — `Testimony 4.mp4` under `public/uploads/`. */
export const STUDIO_TESTIMONY_FEEDBACK_4_FILENAME = "Testimony 4.mp4";

export const STUDIO_TESTIMONY_FEEDBACK_4_EXPECTED_PATH =
  `public/uploads/${STUDIO_TESTIMONY_FEEDBACK_4_FILENAME}`;

export const STUDIO_TESTIMONY_FEEDBACK_4_SRC =
  `/uploads/${STUDIO_TESTIMONY_FEEDBACK_4_FILENAME.replace(/ /g, "%20")}`;

export const STUDIO_TESTIMONY_FEEDBACK_4_THUMB_SRC = `${STUDIO_TESTIMONY_FEEDBACK_4_SRC}#t=0.001`;
