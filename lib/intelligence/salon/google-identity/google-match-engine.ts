// lib/intelligence/salon/google-identity/google-match-engine.ts

import { getSalonGoogleDataSource } from "./providers/places-api-provider";
import type { GooglePlaceCandidate } from "./providers/types";
import {
  detectGoogleIdentityConflicts,
  hostOf,
  nameOverlap,
  normalizePhone,
} from "./google-conflict-engine";
import type {
  GoogleIdentityProspectInput,
  GoogleIdentityRecord,
  GoogleIdentityStatus,
} from "./types";

export type MatchTier =
  | "tier1_name_phone_city"
  | "tier2_name_website"
  | "tier3_website_instagram"
  | "tier4_name_city"
  | "tier5_name_only"
  | "none";

type TierScore = {
  tier: MatchTier;
  confidence: number;
  reason: string;
};

function assignStatus(
  confidence: number,
  hasConflict: boolean,
  tier: MatchTier,
  found: boolean,
): GoogleIdentityStatus {
  if (!found) return "not_found";
  if (hasConflict) return "conflict";
  if (tier === "tier5_name_only") {
    if (confidence >= 60) return "possible";
    return "possible";
  }
  if (confidence >= 95) return "confirmed";
  if (confidence >= 80) return "probable";
  if (confidence >= 60) return "possible";
  return "not_found";
}

function scoreCandidate(
  prospect: GoogleIdentityProspectInput,
  candidate: GooglePlaceCandidate,
): TierScore {
  const name = (prospect.displayName ?? "").trim();
  const city = (prospect.city ?? "").trim().toLowerCase();
  const prospectPhone = normalizePhone(prospect.phone);
  const googlePhone = normalizePhone(candidate.phone);
  const prospectHost = hostOf(prospect.website);
  const googleHost = hostOf(candidate.website);
  const addr = (candidate.formattedAddress ?? "").toLowerCase();
  const overlap = nameOverlap(name, candidate.name ?? "");

  if (name && prospectPhone && city && googlePhone && prospectPhone === googlePhone) {
    if (city && addr.includes(city)) {
      return {
        tier: "tier1_name_phone_city",
        confidence: 100,
        reason: "Tier 1: business name + phone + city",
      };
    }
  }

  if (name && prospectHost && googleHost && prospectHost === googleHost && overlap >= 0.35) {
    return {
      tier: "tier2_name_website",
      confidence: 90,
      reason: "Tier 2: business name + website domain",
    };
  }

  if (prospectHost && googleHost && prospectHost === googleHost && prospect.instagramHandle) {
    return {
      tier: "tier3_website_instagram",
      confidence: 80,
      reason: "Tier 3: website domain + Instagram handle on file",
    };
  }

  if (name && city && addr.includes(city)) {
    const sim = Math.round(overlap * 100);
    const confidence = sim >= 50 ? 70 : 60;
    return {
      tier: "tier4_name_city",
      confidence,
      reason: `Tier 4: name similarity (${sim}%) + city`,
    };
  }

  if (name && overlap >= 0.2) {
    const sim = Math.round(overlap * 100);
    const confidence = Math.min(55, 40 + Math.round(overlap * 15));
    return {
      tier: "tier5_name_only",
      confidence,
      reason: `Tier 5: name-only signal (${sim}% overlap) — not auto-confirmed`,
    };
  }

  return { tier: "none", confidence: 0, reason: "No tier match" };
}

function pickBestCandidate(
  prospect: GoogleIdentityProspectInput,
  candidates: GooglePlaceCandidate[],
): { best?: GooglePlaceCandidate; tier: TierScore } {
  let best: GooglePlaceCandidate | undefined;
  let bestTier: TierScore = { tier: "none", confidence: 0, reason: "No candidates" };

  for (const c of candidates) {
    const tier = scoreCandidate(prospect, c);
    if (tier.confidence > bestTier.confidence) {
      best = c;
      bestTier = tier;
    }
  }

  return { best, tier: bestTier };
}

export async function matchGoogleIdentityForProspect(
  prospect: GoogleIdentityProspectInput,
): Promise<GoogleIdentityRecord> {
  const now = new Date().toISOString();
  const source = getSalonGoogleDataSource();
  const lookup = await source.lookup({
    displayName: prospect.displayName?.trim() || prospect.instagramHandle || "salon",
    city: prospect.city,
    state: prospect.state,
    phone: prospect.phone,
    website: prospect.website,
  });

  const evidence = [...lookup.notes];

  if (!lookup.connected) {
    return {
      prospectId: prospect.prospectId,
      matchConfidence: 0,
      matchReason: "Google data source not connected",
      status: "not_found",
      evidence,
      createdAt: now,
      updatedAt: now,
    };
  }

  if (lookup.candidates.length === 0) {
    return {
      prospectId: prospect.prospectId,
      matchConfidence: 0,
      matchReason: "No Google Business listing found",
      status: "not_found",
      evidence,
      createdAt: now,
      updatedAt: now,
    };
  }

  const { best, tier } = pickBestCandidate(prospect, lookup.candidates);
  const conflict = detectGoogleIdentityConflicts(prospect, best, lookup.candidates);
  if (conflict.reasons.length) evidence.push(...conflict.reasons);

  const found = Boolean(best && tier.confidence > 0);
  let confidence = tier.confidence;
  let status = assignStatus(confidence, conflict.hasConflict, tier.tier, found);

  if (tier.tier === "tier5_name_only" && status === "confirmed") {
    status = "possible";
    confidence = Math.min(confidence, 55);
  }
  if (tier.tier === "tier5_name_only" && status === "probable") {
    status = "possible";
  }

  if (!found) {
    return {
      prospectId: prospect.prospectId,
      matchConfidence: 0,
      matchReason: tier.reason,
      status: "not_found",
      evidence,
      createdAt: now,
      updatedAt: now,
    };
  }

  return {
    prospectId: prospect.prospectId,
    googlePlaceId: best!.placeId,
    googleBusinessName: best!.name,
    googleAddress: best!.formattedAddress,
    googlePhone: best!.phone,
    googleWebsite: best!.website,
    googleMapsUrl: best!.mapsUrl,
    rating: best!.rating,
    reviewCount: best!.reviewCount,
    categories: best!.categories,
    claimedBusiness: undefined,
    permanentlyClosed: best!.permanentlyClosed,
    matchConfidence: confidence,
    matchReason: tier.reason,
    status: conflict.hasConflict ? "conflict" : status,
    evidence,
    createdAt: now,
    updatedAt: now,
  };
}
