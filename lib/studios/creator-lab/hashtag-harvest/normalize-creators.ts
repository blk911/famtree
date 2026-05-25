// lib/studios/creator-lab/hashtag-harvest/normalize-creators.ts
// Deduplicates and merges HarvestedCreatorSeed records across multiple hashtags.

import type { HarvestedCreatorSeed } from "./types";

/**
 * Merges seeds from multiple hashtags.
 * When the same handle appears in multiple hashtags, keeps the one with
 * the most evidence and merges unique evidence snippets.
 */
export function normalizeCreators(seeds: HarvestedCreatorSeed[]): HarvestedCreatorSeed[] {
  const map = new Map<string, HarvestedCreatorSeed>();

  for (const seed of seeds) {
    const key = seed.handle.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!key) continue;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...seed });
      continue;
    }

    // Merge: keep best data, combine evidence
    const merged: HarvestedCreatorSeed = {
      ...existing,
      // Prefer non-handle display name
      displayName:
        existing.displayName !== existing.handle
          ? existing.displayName
          : seed.displayName,
      // Keep caption if missing
      captionSnippet: existing.captionSnippet ?? seed.captionSnippet,
      postUrl: existing.postUrl ?? seed.postUrl,
      imageUrl: existing.imageUrl ?? seed.imageUrl,
      // Prefer specific over null
      detectedCategory: existing.detectedCategory ?? seed.detectedCategory,
      detectedLocation: existing.detectedLocation ?? seed.detectedLocation,
      // Merge evidence, dedupe
      evidence: Array.from(
        new Set([...existing.evidence, ...seed.evidence])
      ).slice(0, 10),
      // Keep first sourceHashtag but could track all — keep it simple
      sourceHashtag: existing.sourceHashtag,
    };

    map.set(key, merged);
  }

  return Array.from(map.values());
}

/**
 * Normalizes a single hashtag string: strips #, lowercase, trim.
 */
export function normalizeHashtag(raw: string): string {
  return raw.replace(/^#+/, "").toLowerCase().trim();
}

/**
 * Parses a textarea/string of hashtags (newline or comma separated).
 * Returns deduplicated, normalized hashtag strings without #.
 */
export function parseHashtags(raw: string): string[] {
  const normalized = raw
    .split(/[\r\n,]+/)
    .map((h) => normalizeHashtag(h))
    .filter((h) => h.length > 0 && h.length <= 80);

  return Array.from(new Set(normalized));
}
