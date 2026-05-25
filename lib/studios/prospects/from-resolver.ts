// lib/studios/prospects/from-resolver.ts
// Converts IG Stub Resolver output (StubResolutionResult) into ProspectRecord upsert inputs.

import type { StubResolutionResult, ResolvedProfile } from "@/lib/studios/creator-lab/ig-stubs/types";
import type { UpsertInput } from "./store";
import type { MatchedUrl, ProspectConfidenceBreakdown } from "./types";

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

// ─── Main converter ───────────────────────────────────────────────────────────

export function resultToProspect(
  result: StubResolutionResult,
  batchId: string,
): UpsertInput | null {
  // Only persist if there's at least one matched profile
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
    identity: {
      name,
      handle: result.seed.handle,
      categoryGuess: guessCategory(services),
      locationGuess,
    },
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
  };
}

// ─── Batch ID generator ───────────────────────────────────────────────────────

export function generateBatchId(): string {
  return `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
