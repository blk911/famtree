// lib/studios/prospects/from-resolver.ts
// Converts IG Stub Resolver output (StubResolutionResult) into ProspectRecord upsert inputs.
// Also provides seedToProspect for saving unresolved seeds as needs_review records.

import type { StubResolutionResult, ResolvedProfile } from "@/lib/studios/creator-lab/ig-stubs/types";
import type { HarvestedCreatorSeed } from "@/lib/studios/creator-lab/hashtag-harvest/types";
import type { UpsertInput } from "./store";
import type { MatchedUrl, ProspectConfidenceBreakdown } from "./types";
import { buildProspectSourcePath } from "./source-path";

// ─── Harvest context ──────────────────────────────────────────────────────────

export interface HarvestContext {
  runId: string;
  batchId: string;
  hashtags: string[];     // all hashtags in this run
  harvestDate: string;    // ISO date
  vertical: string;       // "education"
  sourcePlatform: string; // "instagram"
  sourceTool: string;     // "hashtag_harvest"
}

// ─── Category inference ───────────────────────────────────────────────────────

export function guessCategory(services: string[]): string | null {
  const lower = services.map((s) => s.toLowerCase());
  const has = (...terms: string[]) => terms.some((t) => lower.some((s) => s.includes(t)));

  if (has("lash", "brow", "microblad", "lami")) return "Lash & Brow";
  if (has("inject", "botox", "filler", "dysport", "kybella", "aesthet")) return "Medical Aesthetics";
  if (has("nail", "manicure", "pedicure", "gel nail", "acrylic")) return "Nails";
  if (has("hair", "color", "colour", "balayage", "highlight", "blowout", "keratin", "extension")) return "Hair";
  if (has("massage", "bodywork", "deep tissue")) return "Massage";
  if (has("makeup", "mua", "airbrush")) return "Makeup";
  if (has("tattoo", "piercing")) return "Tattoo & Body Art";
  if (has("facial", "skin", "wax", "waxing", "dermaplaning")) return "Skin & Body";
  if (has("fitness", "yoga", "pilates", "training", "coach", "hiit")) return "Fitness & Wellness";
  if (has("nutrition", "dietitian", "wellness")) return "Health & Nutrition";
  if (has("homeschool", "tutor", "education", "learning", "stem", "math", "reading")) return "Education";
  return null;
}

// ─── Confidence breakdown ─────────────────────────────────────────────────────

function computeConfidence(
  handle: string,
  profiles: ResolvedProfile[],
): ProspectConfidenceBreakdown {
  const best = profiles[0];
  if (!best) return { identityMatch: 0, bookingMatch: 0, categoryMatch: 0, locationMatch: 0, overall: 0 };

  const reason = best.matchReason.toLowerCase();

  let identityMatch = 0;
  if (best.url.toLowerCase().includes(handle.toLowerCase())) identityMatch += 35;
  if (reason.includes("display name")) identityMatch += 25;
  if (reason.includes("ig backlink") || reason.includes("backlink")) identityMatch += 30;
  identityMatch = Math.min(100, identityMatch);

  const highValuePlatforms = ["glossgenius", "vagaro", "styleseat", "booksy"];
  const bookingMatch = highValuePlatforms.includes(best.platform)
    ? Math.min(100, best.confidenceScore + 15)
    : best.confidenceScore;

  const allServices = Array.from(new Set(profiles.flatMap((p) => p.detectedServices)));
  const categoryMatch = Math.min(100, allServices.length * 12);
  const locationMatch = profiles.some((p) => p.detectedLocation) ? 60 : 0;

  return {
    identityMatch,
    bookingMatch,
    categoryMatch,
    locationMatch,
    overall: best.confidenceScore,
  };
}

// ─── Resolved result → UpsertInput ───────────────────────────────────────────

export function resultToProspect(
  result: StubResolutionResult,
  batchId: string,
): UpsertInput | null {
  if (result.resolvedProfiles.length === 0) return null;

  const profiles = result.resolvedProfiles;
  const best = result.bestMatch;

  const services = Array.from(new Set(profiles.flatMap((p) => p.detectedServices)));
  const evidence = Array.from(new Set(profiles.flatMap((p) => p.evidenceSnippets))).slice(0, 15);

  const allMatchedUrls: MatchedUrl[] = profiles.map((p) => ({
    platform: p.platform,
    url: p.url,
    confidence: p.confidenceScore,
    matchReason: p.matchReason,
  }));

  const locationGuess =
    best?.detectedLocation ??
    profiles.find((p) => p.detectedLocation)?.detectedLocation ??
    null;

  const name =
    best?.detectedName ??
    (result.seed.displayName !== result.seed.handle ? result.seed.displayName : null) ??
    result.seed.handle;

  return {
    source: {
      sourceType: "ig-stub-run",
      batchId,
      sourceHandle: result.seed.handle,
      sourceDisplayName: result.seed.displayName,
    },
    vertical: "education",
    sourcePlatform: "instagram",
    sourceTool: "ig-stub-run",
    sourceHashtag: null,
    sourceHashtags: [],
    sourcePath: "",
    runId: null,
    harvestDate: null,
    identity: {
      name,
      handle: result.seed.handle,
      categoryGuess: guessCategory(services),
      locationGuess,
    },
    educationType: null,
    audienceType: null,
    sourceTopic: null,
    platforms: Array.from(new Set(profiles.map((p) => p.platform))),
    bestMatch: best
      ? {
          platform: best.platform,
          url: best.url,
          confidence: best.confidenceScore,
          matchReason: best.matchReason,
        }
      : null,
    services,
    allMatchedUrls,
    evidence,
    confidence: computeConfidence(result.seed.handle, profiles),
    candidateUrlsTested: result.candidateUrlsTested ?? [],
    rejectedCandidateUrls: result.rejectedCandidates ?? [],
    suggestedValidationStatus: "new",
  };
}

// ─── Seed → UpsertInput (for unresolved / weak records) ──────────────────────

/**
 * Converts a raw HarvestedCreatorSeed to a minimal UpsertInput for weak/unresolved records.
 * These are saved with suggestedValidationStatus: "needs_review".
 */
export function seedToProspect(
  seed: HarvestedCreatorSeed,
  ctx: HarvestContext,
): UpsertInput {
  const sourcePath = buildProspectSourcePath({
    vertical:   ctx.vertical,
    platform:   ctx.sourcePlatform,
    sourceTool: ctx.sourceTool,
    date:       ctx.harvestDate,
    hashtag:    seed.sourceHashtag,
  });

  return {
    source: {
      sourceType: "hashtag_harvest",
      batchId:    ctx.batchId,
      sourceHandle:      seed.handle,
      sourceDisplayName: seed.displayName,
    },
    vertical:       ctx.vertical,
    sourcePlatform: ctx.sourcePlatform,
    sourceTool:     ctx.sourceTool,
    sourceHashtag:  seed.sourceHashtag,
    sourceHashtags: [seed.sourceHashtag],
    sourcePath,
    runId:          ctx.runId,
    harvestDate:    ctx.harvestDate,
    identity: {
      name:          seed.displayName,
      handle:        seed.handle,
      categoryGuess: seed.detectedCategory,
      locationGuess: seed.detectedLocation,
    },
    educationType: seed.educationType,
    audienceType:  seed.audienceType,
    sourceTopic:   null,
    platforms:     [],
    bestMatch:     null,
    services:      [],
    allMatchedUrls: [],
    evidence:      seed.evidence,
    confidence:    { identityMatch: 0, bookingMatch: 0, categoryMatch: 0, locationMatch: 0, overall: 0 },
    suggestedValidationStatus: "needs_review",
  };
}

// ─── Batch ID generator ───────────────────────────────────────────────────────

export function generateBatchId(): string {
  return `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
