// lib/studios/styleseat/ig-enrichment.ts
// Finds the best IG/booking-platform match for a StyleSeat operator.
// Uses the EXISTING resolver pipeline — no duplicate logic.
//
// For each operator:
//   1. Generate candidate IG handles from name+city
//   2. For each candidate: generateCandidateUrls() → fastResolve() / deepResolve()
//   3. Return the handle+profiles with the highest confidence score
//   4. Stop early if confidence ≥ 55 to limit network calls

import { generateCandidateUrls } from "@/lib/studios/creator-lab/ig-stubs/url-patterns";
import { fastResolve } from "@/lib/studios/creator-lab/ig-stubs/validator";
import type { ResolvedProfile, IgSeed, ResolveMode } from "@/lib/studios/creator-lab/ig-stubs/types";
import type { StyleSeatOperator } from "./types";
import { generateIgHandleCandidates } from "./normalize";

// Confidence at which we stop trying more handles — "good enough"
const EARLY_STOP_CONFIDENCE = 55;

// ─── Main enrichment function ─────────────────────────────────────────────────

export interface IgEnrichmentResult {
  /** Best candidate handle found (no @) */
  handle: string;
  /** All valid resolved profiles from the best handle */
  profiles: ResolvedProfile[];
  /** Confidence score of the best match (0–100) */
  confidence: number;
  /** How many candidate handles were tried */
  candidatesTried: number;
}

/**
 * Attempts to find the IG handle and booking-platform profiles for a StyleSeat operator.
 * Returns the best match, or null if no handle reached minimum confidence.
 */
export async function findIgMatchForOperator(
  operator: StyleSeatOperator,
  mode: ResolveMode,
): Promise<IgEnrichmentResult | null> {
  const candidates = generateIgHandleCandidates(operator.name, operator.city);

  if (candidates.length === 0) return null;

  // Load deep-resolve module lazily (only in "deep" mode)
  let deepResolve: typeof import("@/lib/studios/creator-lab/ig-stubs/deep-research").deepResolve | null = null;
  if (mode === "deep") {
    try {
      const mod = await import("@/lib/studios/creator-lab/ig-stubs/deep-research");
      deepResolve = mod.deepResolve;
    } catch {
      // deep-research not available — fall back to fast
    }
  }

  let best: IgEnrichmentResult | null = null;

  for (let i = 0; i < candidates.length; i++) {
    const handle = candidates[i];

    const igSeed: IgSeed = {
      handle,
      displayName: operator.name,
    };

    const candidateUrls = generateCandidateUrls(handle);

    let profiles: ResolvedProfile[] = [];
    try {
      profiles = deepResolve
        ? await deepResolve(igSeed, candidateUrls)
        : await fastResolve(igSeed, candidateUrls);
    } catch {
      profiles = [];
    }

    // Filter weak signals — require minimum score to count
    const valid = profiles.filter((p) => p.confidenceScore >= 8);
    const topScore = valid[0]?.confidenceScore ?? 0;

    // Boost score if detected name matches operator name (city-aware)
    const boostedScore = boostScore(topScore, valid, operator);

    if (boostedScore > (best?.confidence ?? 0)) {
      best = {
        handle,
        profiles: valid,
        confidence: boostedScore,
        candidatesTried: i + 1,
      };
    }

    // Early stop — good enough match found
    if (boostedScore >= EARLY_STOP_CONFIDENCE) {
      console.log(`[ig-enrichment] ✓ early stop @${handle} for "${operator.name}" (confidence=${boostedScore})`);
      break;
    }
  }

  // Require minimum confidence to return a result
  if (!best || best.confidence < 10) return null;

  return { ...best, candidatesTried: best.candidatesTried };
}

// ─── Score boost for name + location context ──────────────────────────────────

/**
 * Applies additional scoring based on name similarity and known city.
 * The base resolver doesn't know the StyleSeat city — we do.
 */
function boostScore(
  baseScore: number,
  profiles: ResolvedProfile[],
  operator: StyleSeatOperator,
): number {
  if (baseScore === 0) return 0;

  let boost = 0;
  const nameLower  = operator.name.toLowerCase();
  const cityLower  = operator.city.toLowerCase();

  for (const p of profiles) {
    // Name match on resolved profile
    if (p.detectedName && p.detectedName.toLowerCase().includes(nameLower.split(" ")[0])) {
      boost += 8;
    }
    // City match
    if (p.detectedLocation && p.detectedLocation.toLowerCase().includes(cityLower)) {
      boost += 10;
    }
    // StyleSeat backlink (confirms the same operator)
    if (p.detectedSocialLinks.some((l) => l.includes("styleseat.com"))) {
      boost += 12;
    }
    // High-review operator on a booking platform = likely active business
    if (operator.reviewCount >= 10 && p.detectedServices.length > 0) {
      boost += 5;
    }
  }

  return Math.min(100, baseScore + boost);
}
