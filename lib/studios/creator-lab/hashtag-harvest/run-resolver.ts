// lib/studios/creator-lab/hashtag-harvest/run-resolver.ts
// Feeds HarvestedCreatorSeed records into the IG Stub resolver pipeline,
// upserts ALL seeds as prospects (resolved or not), and returns results.
//
// IMPORTANT: resolution (network) runs in parallel via Promise.allSettled,
// but file upserts run SEQUENTIALLY afterwards to avoid concurrent write
// races on the flat JSON store (causes EPERM on Windows / data loss).

import { generateCandidateUrls } from "@/lib/studios/creator-lab/ig-stubs/url-patterns";
import { fastResolve } from "@/lib/studios/creator-lab/ig-stubs/validator";
import { upsertProspect } from "@/lib/studios/prospects/store";
import { resultToProspect, seedToProspect } from "@/lib/studios/prospects/from-resolver";
import { buildProspectSourcePath } from "@/lib/studios/prospects/source-path";
import type { HarvestContext } from "@/lib/studios/prospects/from-resolver";
import type { ResolveMode, IgSeed, StubResolutionResult, ResolvedProfile } from "@/lib/studios/creator-lab/ig-stubs/types";
import type { HarvestedCreatorSeed, ResolverPipelineResult } from "./types";
import type { UpsertInput } from "@/lib/studios/prospects/store";

export type { HarvestContext };

// Max seeds to resolve per harvest run (cost / time guard)
const MAX_RESOLVE = 40;

// ─── Step 1: resolve profiles in parallel ────────────────────────────────────

interface ResolvedSeed {
  seed: HarvestedCreatorSeed;
  stubResult: StubResolutionResult;
  validProfiles: ResolvedProfile[];
  bestMatch: ResolvedProfile | null;
  status: StubResolutionResult["status"];
  upsertInput: UpsertInput;
  sourcePath: string;
}

export async function runResolverForSeeds(
  seeds: HarvestedCreatorSeed[],
  mode: ResolveMode,
  ctx: HarvestContext,
): Promise<ResolverPipelineResult[]> {
  const capped = seeds.slice(0, MAX_RESOLVE);

  let deepResolve: typeof import("@/lib/studios/creator-lab/ig-stubs/deep-research").deepResolve | null = null;
  if (mode === "deep") {
    try {
      const mod = await import("@/lib/studios/creator-lab/ig-stubs/deep-research");
      deepResolve = mod.deepResolve;
    } catch {
      // fall back to fast
    }
  }

  // ── Phase 1: resolve all seeds in parallel (network-bound) ──────────────────
  const resolvedSeeds = await Promise.allSettled(
    capped.map(async (seed): Promise<ResolvedSeed> => {
      const igSeed: IgSeed = {
        handle: seed.handle,
        displayName: seed.displayName,
      };

      const candidates = generateCandidateUrls(seed.handle);

      let profiles: ResolvedProfile[] = [];
      try {
        profiles = deepResolve
          ? await deepResolve(igSeed, candidates)
          : await fastResolve(igSeed, candidates);
      } catch {
        profiles = [];
      }

      const validProfiles = profiles.filter((p) => p.confidenceScore >= 5);
      const bestMatch = validProfiles[0] ?? null;

      const status: StubResolutionResult["status"] =
        bestMatch && bestMatch.confidenceScore >= 50
          ? "resolved"
          : bestMatch && bestMatch.confidenceScore >= 20
          ? "partial"
          : "unresolved";

      const stubResult: StubResolutionResult = {
        seed: igSeed,
        resolvedProfiles: validProfiles,
        bestMatch,
        status,
      };

      const sourcePath = buildProspectSourcePath({
        vertical:   ctx.vertical,
        platform:   ctx.sourcePlatform,
        sourceTool: ctx.sourceTool,
        date:       ctx.harvestDate,
        hashtag:    seed.sourceHashtag,
      });

      // Build the upsert input now (pure transform, no I/O)
      let upsertInput: UpsertInput;
      const resolved = resultToProspect(stubResult, ctx.batchId);

      if (resolved) {
        // Resolved — enrich with harvest-specific data
        resolved.vertical       = ctx.vertical;
        resolved.sourcePlatform = ctx.sourcePlatform;
        resolved.sourceTool     = ctx.sourceTool;
        resolved.sourceHashtag  = seed.sourceHashtag;
        resolved.sourceHashtags = [seed.sourceHashtag];
        resolved.sourcePath     = sourcePath;
        resolved.runId          = ctx.runId;
        resolved.harvestDate    = ctx.harvestDate;
        resolved.educationType  = seed.educationType ?? null;
        resolved.audienceType   = seed.audienceType  ?? null;
        resolved.platforms      = Array.from(new Set(validProfiles.map((p) => p.platform)));
        resolved.suggestedValidationStatus = "education_relevant";

        if (seed.detectedCategory && !resolved.identity.categoryGuess)
          resolved.identity.categoryGuess = seed.detectedCategory;
        if (seed.detectedLocation && !resolved.identity.locationGuess)
          resolved.identity.locationGuess = seed.detectedLocation;

        resolved.evidence = Array.from(
          new Set([...seed.evidence, ...resolved.evidence])
        ).slice(0, 15);

        upsertInput = resolved;
      } else {
        // Unresolved — save as needs_review, never discard
        upsertInput = seedToProspect(seed, ctx);
      }

      return { seed, stubResult, validProfiles, bestMatch, status, upsertInput, sourcePath };
    })
  );

  // ── Phase 2: upsert prospects sequentially (file I/O — avoids write races) ──
  const results: ResolverPipelineResult[] = [];

  for (let i = 0; i < resolvedSeeds.length; i++) {
    const settled = resolvedSeeds[i];
    const original = capped[i];

    if (settled.status === "rejected") {
      results.push({
        seed: original,
        resolved: false,
        bestMatchUrl: null,
        bestMatchPlatform: null,
        matchedUrlCount: 0,
        prospectId: null,
        confidence: 0,
        notes: settled.reason instanceof Error ? settled.reason.message : "resolution error",
      });
      continue;
    }

    const { seed, validProfiles, bestMatch, status, upsertInput } = settled.value;

    let prospectId: string | null = null;
    try {
      const saved = await upsertProspect(upsertInput);
      prospectId = saved.prospectId;
    } catch (e) {
      console.error(`[run-resolver] upsert failed for @${seed.handle}:`, e);
    }

    results.push({
      seed,
      resolved: status === "resolved" || status === "partial",
      bestMatchUrl: bestMatch?.url ?? null,
      bestMatchPlatform: bestMatch?.platform ?? null,
      matchedUrlCount: validProfiles.length,
      prospectId,
      confidence: bestMatch?.confidenceScore ?? 0,
      notes: bestMatch?.matchReason ?? "",
    });
  }

  return results;
}
