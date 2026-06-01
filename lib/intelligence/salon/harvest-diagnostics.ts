// lib/intelligence/salon/harvest-diagnostics.ts
// Structured hashtag harvest diagnostics for API + UI.

import type {
  ApifyPost,
  HarvestedCreatorSeed,
  ResolverPipelineResult,
} from "@/lib/studios/creator-lab/hashtag-harvest/types";
import { postsForHashtag } from "@/lib/studios/creator-lab/hashtag-harvest/post-hashtag-match";

export type HashtagHarvestPerTagDiagnostic = {
  hashtag: string;
  requestedLimit: number;
  postsReturned: number;
  creatorsExtracted: number;
  prospectsCreated: number;
  prospectsUpdated: number;
  droppedByDedupe: number;
  droppedByFilter: number;
  providerDiscoveryWarnings: string[];
  apifyError?: string;
};

export type HashtagHarvestDiagnostics = {
  hashtagsParsed: number;
  perHashtag: HashtagHarvestPerTagDiagnostic[];
  totals: {
    postsReturned: number;
    creatorsExtracted: number;
    prospectsCreated: number;
    prospectsUpdated: number;
    droppedByDedupe: number;
  };
  warnings: string[];
  errors: string[];
  apifyConnected: boolean;
  apifyActorRunIds: string[];
};

function handleKey(handle: string): string {
  return handle.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function buildHashtagHarvestDiagnostics(params: {
  hashtags: string[];
  maxPerHashtag: number;
  posts: ApifyPost[];
  allSeeds: HarvestedCreatorSeed[];
  normalizedCreators: HarvestedCreatorSeed[];
  results: ResolverPipelineResult[];
  errors: string[];
  warnings: string[];
  perTagApifyErrors?: Record<string, string | undefined>;
  apifyConnected: boolean;
  apifyActorRunIds: string[];
}): HashtagHarvestDiagnostics {
  const {
    hashtags,
    maxPerHashtag,
    posts,
    allSeeds,
    normalizedCreators,
    results,
    errors,
    warnings,
    perTagApifyErrors = {},
    apifyConnected,
    apifyActorRunIds,
  } = params;

  const normalizedHandles = new Set(
    normalizedCreators.map((s) => handleKey(s.handle)),
  );

  const perHashtag: HashtagHarvestPerTagDiagnostic[] = hashtags.map((hashtag) => {
    const tagPosts = postsForHashtag(posts, hashtag, maxPerHashtag);
    const tagSeeds = allSeeds.filter((s) => s.sourceHashtag === hashtag);
    const handlesFromTag = new Set(tagSeeds.map((s) => handleKey(s.handle)));
    const creatorsExtracted = handlesFromTag.size;
    const creatorsDeduped = Array.from(handlesFromTag).filter((h) =>
      normalizedHandles.has(h),
    ).length;
    const droppedByDedupe = Math.max(0, creatorsExtracted - creatorsDeduped);

    const saved = results.filter(
      (r) => r.prospectId && handlesFromTag.has(handleKey(r.seed.handle)),
    );
    const prospectsCreated = saved.length;

    return {
      hashtag,
      requestedLimit: maxPerHashtag,
      postsReturned: tagPosts.length,
      creatorsExtracted,
      prospectsCreated,
      prospectsUpdated: 0,
      droppedByDedupe,
      droppedByFilter: 0,
      providerDiscoveryWarnings: [],
      apifyError: perTagApifyErrors[hashtag],
    };
  });

  const totals = perHashtag.reduce(
    (acc, row) => ({
      postsReturned: acc.postsReturned + row.postsReturned,
      creatorsExtracted: acc.creatorsExtracted + row.creatorsExtracted,
      prospectsCreated: acc.prospectsCreated + row.prospectsCreated,
      prospectsUpdated: acc.prospectsUpdated + row.prospectsUpdated,
      droppedByDedupe: acc.droppedByDedupe + row.droppedByDedupe,
    }),
    {
      postsReturned: 0,
      creatorsExtracted: 0,
      prospectsCreated: 0,
      prospectsUpdated: 0,
      droppedByDedupe: 0,
    },
  );

  return {
    hashtagsParsed: hashtags.length,
    perHashtag,
    totals,
    warnings,
    errors,
    apifyConnected,
    apifyActorRunIds,
  };
}
