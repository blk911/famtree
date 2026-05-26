// lib/studios/prospects/source-path.ts
// Builds the canonical display path for a prospect record.
// Education / Instagram / Hashtag Harvest / 2026-05-26 / #homeschool

export interface SourcePathParams {
  vertical: string;       // e.g. "education"
  platform: string;       // e.g. "instagram"
  sourceTool: string;     // e.g. "hashtag_harvest"
  date: string;           // ISO date string or YYYY-MM-DD
  hashtag?: string | null; // e.g. "homeschool" or "#homeschool"
}

const TOOL_LABELS: Record<string, string> = {
  hashtag_harvest: "Hashtag Harvest",
  ig_stub_run:     "IG Stub Run",
  "ig-stub-run":   "IG Stub Run",
  manual:          "Manual",
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok:    "TikTok",
  youtube:   "YouTube",
  linkedin:  "LinkedIn",
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function toDateSlug(dateStr: string): string {
  try {
    return new Date(dateStr).toISOString().slice(0, 10);
  } catch {
    return dateStr.slice(0, 10);
  }
}

function normalizeHashtag(h: string): string {
  const clean = h.replace(/^#+/, "").trim();
  return clean ? `#${clean}` : "";
}

/**
 * Returns a human-readable source path.
 * Example: "Education / Instagram / Hashtag Harvest / 2026-05-26 / #homeschool"
 */
export function buildProspectSourcePath(params: SourcePathParams): string {
  const vertical  = capitalize(params.vertical);
  const platform  = PLATFORM_LABELS[params.platform.toLowerCase()] ?? capitalize(params.platform);
  const toolLabel = TOOL_LABELS[params.sourceTool] ?? capitalize(params.sourceTool.replace(/_/g, " "));
  const date      = toDateSlug(params.date);
  const hashtag   = params.hashtag ? normalizeHashtag(params.hashtag) : null;

  const parts = [vertical, platform, toolLabel, date];
  if (hashtag) parts.push(hashtag);

  return parts.join(" / ");
}
