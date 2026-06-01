// lib/studios/creator-lab/hashtag-harvest/run-resolver.ts
// Feeds HarvestedCreatorSeed records into the IG Stub resolver pipeline,
// upserts ALL seeds as prospects (resolved or not), and returns results.

import { generateCandidateUrls } from "@/lib/studios/creator-lab/ig-stubs/url-patterns";
import { fastResolveTracked } from "@/lib/studios/creator-lab/ig-stubs/validator";
import { upsertProspect } from "@/lib/studios/prospects/store";
import { resultToProspect, seedToProspect } from "@/lib/studios/prospects/from-resolver";
import { buildProspectSourcePath } from "@/lib/studios/prospects/source-path";
import { enrichSalonBookingProvider } from "@/lib/intelligence/salon/enrich-booking-provider";
import {
  emptySalonResolverDiagnostics,
  tallySalonResolverUpsert,
  type SalonResolverRunDiagnostics,
} from "@/lib/intelligence/salon/salon-resolver-diagnostics";
import type { HarvestContext } from "@/lib/studios/prospects/from-resolver";
import type { ResolveMode, IgSeed, StubResolutionResult, ResolvedProfile, RejectedCandidate } from "@/lib/studios/creator-lab/ig-stubs/types";
import type { UpsertInput } from "@/lib/studios/prospects/store";
import type {
  HarvestedCreatorSeed,
  ResolverPipelineResult,
  RunResolverResult,
  SaveError,
} from "./types";

export type { HarvestContext };

const MAX_GG_PROBES_PER_HARVEST = 100;

interface ResolvedSeed {
  seed: HarvestedCreatorSeed;
  validProfiles: ResolvedProfile[];
  bestMatch: ResolvedProfile | null;
  status: StubResolutionResult["status"];
  candidateUrlsTested: string[];
  rejectedCandidates: RejectedCandidate[];
  upsertInput: UpsertInput;
  resolved: boolean;
}

export async function runResolverForSeeds(
  seeds: HarvestedCreatorSeed[],
  mode: ResolveMode,
  ctx: HarvestContext,
): Promise<RunResolverResult & { resolverDiagnostics?: SalonResolverRunDiagnostics }> {
  const salonHarvest = ctx.vertical === "salon";

  let deepResolve: typeof import("@/lib/studios/creator-lab/ig-stubs/deep-research").deepResolve | null = null;
  if (mode === "deep") {
    try {
      const mod = await import("@/lib/studios/creator-lab/ig-stubs/deep-research");
      deepResolve = mod.deepResolve;
    } catch {
      // fall back to fast silently
    }
  }

  const settled = await Promise.allSettled(
    seeds.map(async (seed, seedIndex): Promise<ResolvedSeed> => {
      const igSeed: IgSeed = {
        handle: seed.handle,
        displayName: seed.displayName,
      };

      const candidates = generateCandidateUrls(seed.handle);

      let profiles: ResolvedProfile[] = [];
      let candidateUrlsTested: string[] = candidates.map((c) => c.url);
      let rejectedCandidates: RejectedCandidate[] = [];
      let linkTrailUrls: string[] = [];

      try {
        if (deepResolve) {
          profiles = await deepResolve(igSeed, candidates);
        } else {
          const tracked = await fastResolveTracked(igSeed, candidates);
          profiles = tracked.confirmedProfiles;
          candidateUrlsTested = tracked.candidateUrlsTested;
          rejectedCandidates = tracked.rejectedCandidates;
          linkTrailUrls = tracked.linkTrailUrls;
        }
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

      const stubResult: StubResolutionResult = {
        seed: igSeed,
        resolvedProfiles: validProfiles,
        bestMatch,
        status,
        candidateUrlsTested,
        rejectedCandidates,
        linkTrailUrls,
      };

      const enableGg = salonHarvest && seedIndex < MAX_GG_PROBES_PER_HARVEST;

      let upsertInput: UpsertInput;
      const resolvedInput = await resultToProspect(stubResult, ctx.batchId, {
        enableHandleDerivedGlossGenius: enableGg,
      });

      if (resolvedInput) {
        resolvedInput.vertical       = ctx.vertical;
        resolvedInput.sourcePlatform = ctx.sourcePlatform;
        resolvedInput.sourceTool     = ctx.sourceTool;
        resolvedInput.sourceHashtag  = seed.sourceHashtag;
        resolvedInput.sourceHashtags = [seed.sourceHashtag];
        resolvedInput.sourcePath     = sourcePath;
        resolvedInput.runId          = ctx.runId;
        resolvedInput.harvestDate    = ctx.harvestDate;
        resolvedInput.educationType  = seed.educationType ?? null;
        resolvedInput.audienceType   = seed.audienceType  ?? null;
        resolvedInput.platforms      = Array.from(new Set(validProfiles.map((p) => p.platform)));
        resolvedInput.suggestedValidationStatus = salonHarvest ? "new" : "education_relevant";

        if (seed.detectedCategory && !resolvedInput.identity.categoryGuess)
          resolvedInput.identity.categoryGuess = seed.detectedCategory;
        if (seed.detectedLocation && !resolvedInput.identity.locationGuess)
          resolvedInput.identity.locationGuess = seed.detectedLocation;

        resolvedInput.evidence = Array.from(
          new Set([...seed.evidence, ...resolvedInput.evidence]),
        ).slice(0, 15);

        upsertInput = resolvedInput;
      } else {
        upsertInput = seedToProspect(seed, ctx);
        if (salonHarvest && enableGg) {
          try {
            const extra = await enrichSalonBookingProvider(
              {
                evidence: seed.evidence,
                linkTrailUrls: [],
                instagramHandle: seed.handle,
                displayName: seed.displayName,
                bio: seed.evidence.join(" "),
              },
              { enableHandleDerivedGlossGenius: true },
            );
            Object.assign(upsertInput, extra);
          } catch {
            // GG failure must not fail harvest
          }
        }
      }

      return {
        seed,
        validProfiles,
        bestMatch,
        status,
        candidateUrlsTested,
        rejectedCandidates,
        upsertInput,
        resolved: status === "resolved" || status === "partial",
      };
    }),
  );

  const results: ResolverPipelineResult[] = [];
  const saveErrors: SaveError[] = [];
  const savedProspectIds: string[] = [];
  const savedHandles: string[] = [];
  let savedCount = 0;
  let failedToSaveCount = 0;
  const upsertAttemptCount = settled.filter((s) => s.status === "fulfilled").length;
  const resolverDiagnostics = salonHarvest ? emptySalonResolverDiagnostics() : undefined;
  if (resolverDiagnostics) {
    resolverDiagnostics.harvested = seeds.length;
    resolverDiagnostics.deduped = seeds.length;
  }

  for (let i = 0; i < settled.length; i++) {
    const s = settled[i];
    const original = seeds[i];

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
      if (resolverDiagnostics) resolverDiagnostics.unknown = (resolverDiagnostics.unknown ?? 0) + 1;
      continue;
    }

    const { seed, validProfiles, bestMatch, status, upsertInput, resolved } = s.value;

    let prospectId: string | null = null;
    let saveError: string | null = null;

    try {
      const saved = await upsertProspect(upsertInput);
      prospectId = saved.prospectId;
      savedCount++;
      savedProspectIds.push(saved.prospectId);
      savedHandles.push(seed.handle);
      if (resolverDiagnostics) {
        tallySalonResolverUpsert(resolverDiagnostics, upsertInput, resolved);
      }
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
      if (resolverDiagnostics) resolverDiagnostics.unknown = (resolverDiagnostics.unknown ?? 0) + 1;
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

  return {
    results,
    savedCount,
    failedToSaveCount,
    saveErrors,
    upsertAttemptCount,
    savedProspectIds,
    savedHandles,
    resolverDiagnostics,
  };
}
