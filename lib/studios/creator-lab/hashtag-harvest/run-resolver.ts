// lib/studios/creator-lab/hashtag-harvest/run-resolver.ts
// Feeds HarvestedCreatorSeed records into the IG Stub resolver pipeline,
// upserts ALL seeds as prospects (resolved or not), and returns results.

import { generateCandidateUrls } from "@/lib/studios/creator-lab/ig-stubs/url-patterns";
import { fastResolve } from "@/lib/studios/creator-lab/ig-stubs/validator";
import { upsertProspect } from "@/lib/studios/prospects/store";
import { resultToProspect, seedToProspect } from "@/lib/studios/prospects/from-resolver";
import { buildProspectSourcePath } from "@/lib/studios/prospects/source-path";
import type { HarvestContext } from "@/lib/studios/prospects/from-resolver";
import type { ResolveMode, IgSeed, StubResolutionResult, ResolvedProfile } from "@/lib/studios/creator-lab/ig-stubs/types";
import type { HarvestedCreatorSeed, ResolverPipelineResult } from "./types";

export type { HarvestContext };

// Max seeds to resolve per harvest run (cost / time guard)
const MAX_RESOLVE = 40;

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

  const settled = await Promise.allSettled(
    capped.map(async (seed): Promise<ResolverPipelineResult> => {
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

      // Build sourcePath for this specific hashtag
      const sourcePath = buildProspectSourcePath({
        vertical:   ctx.vertical,
        platform:   ctx.sourcePlatform,
        sourceTool: ctx.sourceTool,
        date:       ctx.harvestDate,
        hashtag:    seed.sourceHashtag,
      });

      let prospectId: string | null = null;
      try {
        let input = resultToProspect(stubResult, ctx.batchId);

        if (input) {
          // Enrich with harvest-specific data
          input.vertical       = ctx.vertical;
          input.sourcePlatform = ctx.sourcePlatform;
          input.sourceTool     = ctx.sourceTool;
          input.sourceHashtag  = seed.sourceHashtag;
          input.sourceHashtags = [seed.sourceHashtag];
          input.sourcePath     = sourcePath;
          input.runId          = ctx.runId;
          input.harvestDate    = ctx.harvestDate;
          input.educationType  = seed.educationType ?? null;
          input.audienceType   = seed.audienceType  ?? null;
          input.platforms      = Array.from(new Set(validProfiles.map((p) => p.platform)));
          input.suggestedValidationStatus = "education_relevant";

          if (seed.detectedCategory && !input.identity.categoryGuess)
            input.identity.categoryGuess = seed.detectedCategory;
          if (seed.detectedLocation && !input.identity.locationGuess)
            input.identity.locationGuess = seed.detectedLocation;

          input.evidence = Array.from(
            new Set([...seed.evidence, ...input.evidence])
          ).slice(0, 15);
        } else {
          // Unresolved — save as needs_review so nothing is discarded
          input = seedToProspect(seed, ctx);
        }

        const saved = await upsertProspect(input);
        prospectId = saved.prospectId;
      } catch (e) {
        console.error(`[run-resolver] upsert failed for @${seed.handle}:`, e);
      }

      return {
        seed,
        resolved: status === "resolved" || status === "partial",
        bestMatchUrl: bestMatch?.url ?? null,
        bestMatchPlatform: bestMatch?.platform ?? null,
        matchedUrlCount: validProfiles.length,
        prospectId,
        confidence: bestMatch?.confidenceScore ?? 0,
        notes: bestMatch?.matchReason ?? "",
      };
    })
  );

  return settled.map((r, i): ResolverPipelineResult => {
    if (r.status === "fulfilled") return r.value;
    return {
      seed: capped[i],
      resolved: false,
      bestMatchUrl: null,
      bestMatchPlatform: null,
      matchedUrlCount: 0,
      prospectId: null,
      confidence: 0,
      notes: r.reason instanceof Error ? r.reason.message : "unknown error",
    };
  });
}
