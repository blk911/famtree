export type ConciergeMode = "concierge" | "studio_voice";

/** Infer assistant mode + persistence bucket from pathname (/studios/* only — widget mounts there). */
export function inferStudiosConciergeContext(pathname: string): {
  mode: ConciergeMode;
  contextKey: string;
  studioSlug: string | null;
} {
  const path = pathname.replace(/\/+$/, "") || "/";
  const liveStudioMatch = /^\/studios\/([^/]+)$/.exec(path);
  const reserved = new Set(["start", "apply", "template"]);

  if (liveStudioMatch) {
    const slug = liveStudioMatch[1];
    if (slug && !reserved.has(slug)) {
      return { mode: "studio_voice", contextKey: slug, studioSlug: slug };
    }
  }

  return { mode: "concierge", contextKey: "platform", studioSlug: null };
}
