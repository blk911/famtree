// lib/studios/creator-lab/hashtag-harvest/run-resolver.ts
// Feeds HarvestedCreatorSeed records into the IG Stub resolver pipeline,
// upserts ALL seeds as prospects (resolved or not), and returns results.

import { generateCandidateUrls } from "@/lib/studios/creator-lab/ig-stubs/url-patterns";
import { fastResolveTracked } from "@/lib/studios/creator-lab/ig-stubs/validator";
import { resolveIgSeed } from "@/lib/studios/creator-lab/ig-stubs/resolve-seed";
import { fetchIgProfiles } from "@/lib/studios/creator-lab/ig-stubs/ig-profile-fetch";
import { upsertProspect } from "@/lib/studios/prospects/store";
import { resultToProspect, seedToProspect } from "@/lib/studios/prospects/from-resolver";
import { buildProspectSourcePath } from "@/lib/studios/prospects/source-path";
import {
  emptySalonResolverDiagnostics,
  tallySalonResolverUpsert,
  type SalonResolverRunDiagnostics,
} from "@/lib/intelligence/salon/salon-resolver-diagnostics";
import {
  applyGgSalonEnrichment,
  upsertInputToGgEnrichInput,
} from "@/lib/intelligence/salon/apply-gg-enrichment";
import { upsertBusinessStack } from "@/lib/intelligence/salon/business-stack/stack-store";
import {
  DEFAULT_GG_RESOLVER_CAP,
  emptyGgRunDiagnostics,
  mergeGgRunDiagnostics,
} from "@/lib/intelligence/salon/gg-resolver-types";
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

export type RunResolverOptions = {
  /** Max GG probes per harvest (default 250). Ignored when runGgOnAllDeduped is true. */
  ggMaxProbes?: number;
  /** Probe GlossGenius for every deduped prospect (no cap). */
  runGgOnAllDeduped?: boolean;
  /** Run SerpAPI / Google CSE on up to 50 deduped prospects after trail resolution. */
  runPublicDiscovery?: boolean;
  crawlWebsite?: boolean;
};

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
  resolverOptions?: RunResolverOptions,
): Promise<RunResolverResult & { resolverDiagnostics?: SalonResolverRunDiagnostics }> {
  const salonHarvest = ctx.vertical === "salon";
  const ggMaxProbes = resolverOptions?.ggMaxProbes ?? DEFAULT_GG_RESOLVER_CAP;
  const runGgOnAllDeduped = resolverOptions?.runGgOnAllDeduped ?? false;

  let deepResolve: typeof import("@/lib/studios/creator-lab/ig-stubs/deep-research").deepResolve | null = null;
  if (mode === "deep") {
    try {
      const mod = await import("@/lib/studios/creator-lab/ig-stubs/deep-research");
      deepResolve = mod.deepResolve;
    } catch {
      // fall back to fast silently
    }
  }

  const salonProfileFetch = salonHarvest
    ? await fetchIgProfiles(seeds.map((s) => s.handle))
    : null;

  // Phase 1: parallel IG resolution (salon: profile fetch + direct URL first)
  const settled = await Promise.allSettled(
    seeds.map(async (seed): Promise<ResolvedSeed> => {
      const igSeed: IgSeed = {
        handle: seed.handle,
        displayName: seed.displayName,
      };

      const sourcePath = buildProspectSourcePath({
        vertical:   ctx.vertical,
        platform:   ctx.sourcePlatform,
        sourceTool: ctx.sourceTool,
        date:       ctx.harvestDate,
        hashtag:    seed.sourceHashtag,
      });

      let stubResult: StubResolutionResult;

      if (salonHarvest && salonProfileFetch) {
        stubResult = await resolveIgSeed(igSeed, {
          mode: deepResolve ? "deep" : "fast",
          profileFetch: salonProfileFetch,
          igProfile: salonProfileFetch.profiles.get(seed.handle.toLowerCase()) ?? null,
        });
      } else {
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

        stubResult = {
          seed: igSeed,
          resolvedProfiles: validProfiles,
          bestMatch,
          status,
          candidateUrlsTested,
          rejectedCandidates,
          linkTrailUrls,
        };
      }

      const validProfiles = stubResult.resolvedProfiles;
      const bestMatch = stubResult.bestMatch;
      const status = stubResult.status;

      let upsertInput: UpsertInput;
      const resolvedInput = await resultToProspect(stubResult, ctx.batchId, {
        enableHandleDerivedGlossGenius: false,
        skipLegacyBookingEnrichment: salonHarvest,
        vertical: ctx.vertical,
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
      }

      return {
        seed,
        validProfiles,
        bestMatch,
        status,
        candidateUrlsTested: stubResult.candidateUrlsTested ?? [],
        rejectedCandidates: stubResult.rejectedCandidates ?? [],
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
  const ggRun = salonHarvest ? emptyGgRunDiagnostics() : null;

  if (resolverDiagnostics) {
    resolverDiagnostics.harvested = seeds.length;
    resolverDiagnostics.deduped = seeds.length;
    if (ggRun) ggRun.dedupedProspects = seeds.length;
  }

  // Phase 2: sequential GG enrichment on deduped prospects (salon only)
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

    let { seed, validProfiles, bestMatch, status, upsertInput, resolved } = s.value;

    let businessStack: Awaited<
      ReturnType<typeof applyGgSalonEnrichment>
    >["businessStack"];

    if (salonHarvest && ggRun) {
      const runPublicSearch =
        resolverOptions?.runPublicDiscovery === true && i < 50;
      try {
      const enrichResult = await applyGgSalonEnrichment(
        upsertInputToGgEnrichInput(upsertInput),
        {
          index: i,
          maxProbes: ggMaxProbes,
          runGgOnAllDeduped,
          runPublicSearch,
          forceSearch: runPublicSearch,
          crawlWebsite: resolverOptions?.crawlWebsite ?? runPublicSearch,
        },
      );
        businessStack = enrichResult.businessStack;
        const { bookingFields, gg, runDelta } = enrichResult;
        mergeGgRunDiagnostics(ggRun, runDelta);
        upsertInput = {
          ...upsertInput,
          ...bookingFields,
          ggResolverStatus: gg.ggResolverStatus,
          ggCheckedUrls: gg.ggCheckedUrls ?? bookingFields.ggCheckedUrls,
          ggResolverReason: gg.ggResolverReason,
          providerResolverReason: bookingFields.providerResolverReason,
          providerDiscoveryDebug: bookingFields.providerDiscoveryDebug,
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        upsertInput.ggResolverReason = `provider_discovery_skipped: ${msg}`;
        if (ggRun) {
          mergeGgRunDiagnostics(ggRun, { ggError: 1 });
        }
      }
    }

    let prospectId: string | null = null;
    let saveError: string | null = null;

    try {
      const saved = await upsertProspect(upsertInput);
      prospectId = saved.prospectId;
      if (salonHarvest && businessStack && prospectId) {
        try {
          await upsertBusinessStack({ ...businessStack, prospectId });
        } catch {
          // non-fatal
        }
      }
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

  if (resolverDiagnostics && ggRun) {
    Object.assign(resolverDiagnostics, ggRun);
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
