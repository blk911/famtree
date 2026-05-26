// lib/studios/creator-lab/hashtag-harvest/run-resolver.ts
// Feeds HarvestedCreatorSeed records into the IG Stub resolver pipeline,
// upserts ALL seeds as prospects (resolved or not), and returns results.
//
// Architecture: two-phase.
//   Phase 1 — URL resolution runs in PARALLEL (network-bound, expensive).
//   Phase 2 — File upserts run SEQUENTIALLY to prevent concurrent write
//              races on the flat JSON store (EPERM on Windows / data loss).

import { generateCandidateUrls } from "@/lib/studios/creator-lab/ig-stubs/url-patterns";
import { fastResolve } from "@/lib/studios/creator-lab/ig-stubs/validator";
import { upsertProspect } from "@/lib/studios/prospects/store";
import { resultToProspect, seedToProspect } from "@/lib/studios/prospects/from-resolver";
import { buildProspectSourcePath } from "@/lib/studios/prospects/source-path";
import type { HarvestContext } from "@/lib/studios/prospects/from-resolver";
import type { ResolveMode, IgSeed, StubResolutionResult, ResolvedProfile } from "@/lib/studios/creator-lab/ig-stubs/types";
import type { UpsertInput } from "@/lib/studios/prospects/store";
import type {
  HarvestedCreatorSeed,
  ResolverPipelineResult,
  RunResolverResult,
  SaveError,
} from "./types";

export type { HarvestContext };

// Max seeds to resolve per harvest run (cost / time guard)
const MAX_RESOLVE = 40;

// ─── Internal resolved-seed shape (phase 1 output) ───────────────────────────

interface ResolvedSeed {
  seed: HarvestedCreatorSeed;
  validProfiles: ResolvedProfile[];
  bestMatch: ResolvedProfile | null;
  status: StubResolutionResult["status"];
  upsertInput: UpsertInput;
}

// ─── Main entry ───────────────────────────────────────────────────────────────

export async function runResolverForSeeds(
  seeds: HarvestedCreatorSeed[],
  mode: ResolveMode,
  ctx: HarvestContext,
): Promise<RunResolverResult> {
  const capped = seeds.slice(0, MAX_RESOLVE);

  // Load deep-resolve module lazily (only in "deep" mode)
  let deepResolve: typeof import("@/lib/studios/creator-lab/ig-stubs/deep-research").deepResolve | null = null;
  if (mode === "deep") {
    try {
      const mod = await import("@/lib/studios/creator-lab/ig-stubs/deep-research");
      deepResolve = mod.deepResolve;
    } catch {
      // fall back to fast silently
    }
  }

  // ── Phase 1: resolve all seeds in parallel (network I/O) ──────────────────
  const settled = await Promise.allSettled(
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

      const sourcePath = buildProspectSourcePath({
        vertical:   ctx.vertical,
        platform:   ctx.sourcePlatform,
        sourceTool: ctx.sourceTool,
        date:       ctx.harvestDate,
        hashtag:    seed.sourceHashtag,
      });

      // Build upsert input (pure transform, no I/O) so phase 2 is trivially serialisable
      const stubResult: StubResolutionResult = {
        seed: igSeed,
        resolvedProfiles: validProfiles,
        bestMatch,
        status,
      };

      let upsertInput: UpsertInput;
      const resolved = resultToProspect(stubResult, ctx.batchId);

      if (resolved) {
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
        // Unresolved — still save, but as needs_review
        upsertInput = seedToProspect(seed, ctx);
      }

      return { seed, validProfiles, bestMatch, status, upsertInput };
    })
  );

  // ── Phase 2: upsert prospects SEQUENTIALLY (file I/O — no concurrent writes) ──
  const results: ResolverPipelineResult[] = [];
  const saveErrors: SaveError[] = [];
  let savedCount = 0;
  let failedToSaveCount = 0;

  for (let i = 0; i < settled.length; i++) {
    const s = settled[i];
    const original = capped[i];

    // Resolution itself failed — still record it, nothing to upsert
    if (s.status === "rejected") {
      const msg = s.reason instanceof Error ? s.reason.message : "resolution error";
      results.push({
        seed: original,
        resolved: false,
        bestMatchUrl: null,
        bestMatchPlatform: null,
        matchedUrlCount: 0,
        prospectId: null,
        confidence: 0,
        notes: msg,
        saveError: null,
      });
      continue;
    }

    const { seed, validProfiles, bestMatch, status, upsertInput } = s.value;

    let prospectId: string | null = null;
    let saveError: string | null = null;

    try {
      const saved = await upsertProspect(upsertInput);
      prospectId = saved.prospectId;
      savedCount++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      saveError = msg;
      failedToSaveCount++;
      saveErrors.push({
        handle: seed.handle,
        sourceHashtag: seed.sourceHashtag,
        platform: bestMatch?.platform ?? null,
        message: msg,
      });
      // Log server-side so nothing is silent in the server console
      console.error(`[run-resolver] upsert failed for @${seed.handle} (${seed.sourceHashtag}):`, e);
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
      saveError,
    });
  }

  return { results, savedCount, failedToSaveCount, saveErrors };
}
