// lib/studios/creator-lab/hashtag-harvest/run-resolver.ts
// Feeds HarvestedCreatorSeed records into the existing IG Stub resolver pipeline
// and upserts prospect records. Reuses — never rebuilds — existing resolver logic.

import { generateCandidateUrls } from "@/lib/studios/creator-lab/ig-stubs/url-patterns";
import { fastResolve } from "@/lib/studios/creator-lab/ig-stubs/validator";
import { upsertProspect } from "@/lib/studios/prospects/store";
import { resultToProspect } from "@/lib/studios/prospects/from-resolver";
import type { ResolveMode, IgSeed, StubResolutionResult, ResolvedProfile } from "@/lib/studios/creator-lab/ig-stubs/types";
import type { HarvestedCreatorSeed, ResolverPipelineResult } from "./types";

// Max seeds to resolve per harvest run (cost / time guard)
const MAX_RESOLVE = 40;

/**
 * Runs each creator seed through the existing resolver pipeline,
 * upserts prospect records, and returns pipeline results.
 * Never throws — errors are captured per-seed.
 */
export async function runResolverForSeeds(
  seeds: HarvestedCreatorSeed[],
  mode: ResolveMode,
  batchId: string,
): Promise<ResolverPipelineResult[]> {
  const capped = seeds.slice(0, MAX_RESOLVE);

  // Deep resolve import is dynamic (lazy) to avoid build-time instantiation
  let deepResolve: typeof import("@/lib/studios/creator-lab/ig-stubs/deep-research").deepResolve | null = null;
  if (mode === "deep") {
    try {
      const mod = await import("@/lib/studios/creator-lab/ig-stubs/deep-research");
      deepResolve = mod.deepResolve;
    } catch {
      // fall back to fast
    }
  }

  // Process all seeds in parallel
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

      // Upsert prospect — preserve any existing status/notes
      let prospectId: string | null = null;
      try {
        const input = resultToProspect(stubResult, batchId);
        if (input) {
          // Enrich with harvest-specific data
          if (seed.detectedCategory && !input.identity.categoryGuess) {
            input.identity.categoryGuess = seed.detectedCategory;
          }
          if (seed.detectedLocation && !input.identity.locationGuess) {
            input.identity.locationGuess = seed.detectedLocation;
          }
          // Merge harvest evidence
          input.evidence = Array.from(
            new Set([...seed.evidence, ...input.evidence])
          ).slice(0, 15);

          const saved = await upsertProspect(input);
          prospectId = saved.prospectId;
        }
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
