// lib/studios/creator-lab/hashtag-harvest/compute-hashtag-stats.ts
// Per-hashtag harvest diagnostics (posts, creators, dedupe, providers, prospects).

import { detectBookingFromProspectTrail } from "@/lib/intelligence/salon/booking-from-trail";
import { postsForHashtag } from "./post-hashtag-match";

export { postsForHashtag };
import type {
  ApifyPost,
  HarvestedCreatorSeed,
  HashtagHarvestHashtagStats,
  HashtagHarvestStatsTotals,
  ResolverPipelineResult,
} from "./types";

function handleKey(handle: string): string {
  return handle.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function seedHasBookingProvider(seed: HarvestedCreatorSeed): boolean {
  const detected = detectBookingFromProspectTrail({
    bestMatchUrl: seed.profileUrl,
    evidence: seed.evidence,
  });
  return Boolean(detected.bookingProvider);
}

function resultHasBookingProvider(result: ResolverPipelineResult): boolean {
  const detected = detectBookingFromProspectTrail({
    bestMatchUrl: result.bestMatchUrl ?? result.seed.profileUrl,
    evidence: result.seed.evidence,
  });
  return Boolean(detected.bookingProvider);
}

export function computeHashtagHarvestStats(
  hashtags: string[],
  posts: ApifyPost[],
  allSeeds: HarvestedCreatorSeed[],
  normalizedCreators: HarvestedCreatorSeed[],
  results: ResolverPipelineResult[],
  maxPerHashtag: number,
): { perHashtag: HashtagHarvestHashtagStats[]; totals: HashtagHarvestStatsTotals } {
  const normalizedHandles = new Set(
    normalizedCreators.map((s) => handleKey(s.handle)),
  );

  const bookingByHandle = new Map<string, boolean>();
  for (const seed of allSeeds) {
    if (seedHasBookingProvider(seed)) {
      bookingByHandle.set(handleKey(seed.handle), true);
    }
  }
  for (const result of results) {
    if (resultHasBookingProvider(result)) {
      bookingByHandle.set(handleKey(result.seed.handle), true);
    }
  }

  const perHashtag: HashtagHarvestHashtagStats[] = hashtags.map((hashtag) => {
    const tagPosts = postsForHashtag(posts, hashtag, maxPerHashtag);
    const tagSeeds = allSeeds.filter((s) => s.sourceHashtag === hashtag);
    const handlesFromTag = new Set(tagSeeds.map((s) => handleKey(s.handle)));

    const creatorsFound = handlesFromTag.size;
    const creatorsDeduped = Array.from(handlesFromTag).filter((h) =>
      normalizedHandles.has(h),
    ).length;

    let bookingProvidersFound = 0;
    for (const h of Array.from(handlesFromTag)) {
      if (bookingByHandle.get(h)) bookingProvidersFound++;
    }

    const finalProspects = results.filter(
      (r) => r.prospectId && handlesFromTag.has(handleKey(r.seed.handle)),
    ).length;

    return {
      hashtag,
      postsPulled: tagPosts.length,
      creatorsFound,
      creatorsDeduped,
      bookingProvidersFound,
      finalProspects,
    };
  });

  const totals: HashtagHarvestStatsTotals = perHashtag.reduce(
    (acc, row) => ({
      postsPulled: acc.postsPulled + row.postsPulled,
      creatorsFound: acc.creatorsFound + row.creatorsFound,
      creatorsDeduped: acc.creatorsDeduped + row.creatorsDeduped,
      bookingProvidersFound: acc.bookingProvidersFound + row.bookingProvidersFound,
      finalProspects: acc.finalProspects + row.finalProspects,
    }),
    {
      postsPulled: 0,
      creatorsFound: 0,
      creatorsDeduped: 0,
      bookingProvidersFound: 0,
      finalProspects: 0,
    },
  );

  return { perHashtag, totals };
}
