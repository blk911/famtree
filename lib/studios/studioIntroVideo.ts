/** Public URL for studio hero intro — file lives under `public/uploads/`. */
const STUDIOS_RELATIONSHIP_INTRO_FILE =
  "Studios_ Relationship-Based Business_720p_caption.mp4";

export const STUDIO_INTRO_VIDEO_SRC = `/uploads/${encodeURIComponent(STUDIOS_RELATIONSHIP_INTRO_FILE)}`;

/** Seek hint helps browsers paint the first frame as thumbnail (`preload="metadata"`). */
export const STUDIO_INTRO_VIDEO_THUMB_SRC = `${STUDIO_INTRO_VIDEO_SRC}#t=0.001`;

/** HeyGen community testimonial — whitelist in `.gitignore` under `public/uploads/*`. */
export const HAILEY_COMMUNITY_TESTIMONIAL_VIDEO_SRC =
  "/uploads/Hailey%27s%20Community%20Testimonial_720p_caption.mp4";

export const HAILEY_COMMUNITY_TESTIMONIAL_VIDEO_THUMB_SRC =
  `${HAILEY_COMMUNITY_TESTIMONIAL_VIDEO_SRC}#t=0.001`;
