// lib/studios/creator-lab/hashtag-harvest/extract-post-creators.ts
// Extracts HarvestedCreatorSeed records from raw Apify post items.
// Uses the vertical classifier router — no education-specific logic here.

import type { ApifyPost, HarvestedCreatorSeed } from "./types";
import { classify } from "./classifiers/index";
import type { EducationType, AudienceType } from "./education-config";

// ─── Location detection (shared across all verticals) ────────────────────────

const LOCATION_KEYWORDS: Record<string, string> = {
  denver: "Denver, CO",
  nyc: "New York, NY",
  "new york": "New York, NY",
  "los angeles": "Los Angeles, CA",
  la: "Los Angeles, CA",
  miami: "Miami, FL",
  chicago: "Chicago, IL",
  houston: "Houston, TX",
  dallas: "Dallas, TX",
  atlanta: "Atlanta, GA",
  austin: "Austin, TX",
  seattle: "Seattle, WA",
  boston: "Boston, MA",
  phoenix: "Phoenix, AZ",
  nashville: "Nashville, TN",
  "las vegas": "Las Vegas, NV",
  portland: "Portland, OR",
  charlotte: "Charlotte, NC",
  "san francisco": "San Francisco, CA",
  sf: "San Francisco, CA",
};

function detectLocation(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [keyword, location] of Object.entries(LOCATION_KEYWORDS)) {
    if (lower.includes(keyword)) return location;
  }
  return null;
}

// ─── Handle / name / URL extraction ──────────────────────────────────────────

function extractHandle(post: ApifyPost): string | null {
  const raw =
    post.ownerUsername ??
    post.owner?.username ??
    post.username ??
    null;
  if (!raw) return null;
  return raw.replace(/^@/, "").toLowerCase().trim() || null;
}

function extractDisplayName(post: ApifyPost, handle: string): string {
  const raw =
    post.ownerFullName ??
    post.fullName ??
    post.owner?.fullName ??
    null;
  return (raw && raw.trim()) ? raw.trim() : handle;
}

function extractPostUrl(post: ApifyPost): string | null {
  if (post.url)       return post.url;
  if (post.postUrl)   return post.postUrl;
  if (post.shortCode) return `https://www.instagram.com/p/${post.shortCode}/`;
  return null;
}

function extractImageUrl(post: ApifyPost): string | null {
  return post.imageUrl ?? post.thumbnailUrl ?? post.displayUrl ?? null;
}

// ─── Main extractor ───────────────────────────────────────────────────────────

/**
 * Extracts unique creator seeds from a batch of Apify posts for a single hashtag.
 * Deduplicates by handle within the batch.
 * Routes classification through the vertical classifier (education, salon, …).
 */
export function extractPostCreators(
  posts: ApifyPost[],
  sourceHashtag: string,
  marketHint: string,
  categoryHint: string,
  verticalKey = "education",
): HarvestedCreatorSeed[] {
  const seen  = new Set<string>();
  const seeds: HarvestedCreatorSeed[] = [];

  for (const post of posts) {
    const handle = extractHandle(post);
    if (!handle || handle.length < 2) continue;
    if (seen.has(handle)) continue;
    seen.add(handle);

    const displayName    = extractDisplayName(post, handle);
    const caption        = (post.caption ?? "").slice(0, 400);
    const captionSnippet = caption.slice(0, 200) || null;
    const postHashtags   = (post.hashtags ?? []).join(" ");
    const fullText       = `${displayName} ${caption} ${postHashtags} ${marketHint} ${categoryHint}`;

    const detectedLocation = detectLocation(fullText) ?? (marketHint || null);

    // ── Vertical-aware classification ─────────────────────────────────────────
    const classification = classify(verticalKey, sourceHashtag, caption, fullText);

    // ── Education backward compat fields ──────────────────────────────────────
    // Only populated when the education classifier ran; null for all other verticals.
    const educationType: EducationType | null =
      verticalKey === "education" ? (classification.primaryType as EducationType) : null;
    const audienceType: AudienceType | null =
      verticalKey === "education" ? (classification.secondaryType as AudienceType) : null;

    // ── Evidence trail ────────────────────────────────────────────────────────
    const evidence: string[] = [];
    if (captionSnippet) evidence.push(`Caption: "${captionSnippet.slice(0, 100)}"`);
    if (classification.primaryType && classification.primaryType !== "unknown")
      evidence.push(`${verticalKey} type: ${classification.primaryLabel}`);
    if (detectedLocation) evidence.push(`Location: ${detectedLocation}`);
    if (classification.classifierSignals.length)
      evidence.push(`Signals: ${classification.classifierSignals.join(", ")}`);
    evidence.push(`Source hashtag: #${sourceHashtag}`);

    seeds.push({
      handle,
      displayName,
      profileUrl:    `https://www.instagram.com/${handle}/`,
      sourceHashtag,
      captionSnippet,
      postUrl:       extractPostUrl(post),
      imageUrl:      extractImageUrl(post),
      detectedCategory: categoryHint || null,
      detectedLocation,
      // Vertical classification
      verticalKey,
      primaryType:       classification.primaryType,
      secondaryType:     classification.secondaryType,
      primaryLabel:      classification.primaryLabel,
      secondaryLabel:    classification.secondaryLabel,
      classifierSignals: classification.signals,
      // Backward compat
      educationType,
      audienceType,
      evidence,
    });
  }

  return seeds;
}
