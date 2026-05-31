// lib/intelligence/transpo/opportunity-engine.ts
// Transpo Opportunity Signal Engine.
//
// Input:  Carrier Master records (+ optional carrier verifications)
// Output: Opportunity Records — each carrier scored against buy-signals, with
//         the matched signals and a recommended sales play.
//
// Pure, deterministic, side-effect free. Verification data is optional: when a
// carrier has a verification row, extra public-presence signals are added.

import type { TranspoCarrierTarget, TranspoSource } from "./types";
import type {
  TranspoCarrierVerification,
  TranspoVerificationStatus,
} from "./verification-types";

export type TranspoOpportunitySignalId =
  // Carrier-master signals
  | "active_authority"
  | "small_fleet"
  | "single_truck"
  | "missing_website"
  | "missing_social"
  | "local_market"
  // Verification-derived signals
  | "no_google_business"
  | "low_reviews"
  | "no_website_verified"
  | "residential_address"
  | "po_box_address"
  | "unverified_public_presence"
  | "verified_established"
  // Google-enrichment-derived signals
  | "google_found_low_confidence"
  | "google_has_website"
  | "google_strong_presence"
  | "no_google_reviews"
  // Website-crawl-derived signals
  | "website_broken"
  | "parked_domain"
  | "hiring_site_signal"
  | "owner_operator_site_signal"
  | "quote_request_present"
  | "no_contact_signal"
  // State-registry-derived signals
  | "new_state_entity"
  | "state_registry_not_found"
  | "state_entity_inactive"
  | "strong_entity_match";

export type TranspoOpportunitySignal = {
  id: TranspoOpportunitySignalId;
  label: string;
  weight: number;
};

export type TranspoOpportunityRecord = TranspoCarrierTarget & {
  score: number;
  signals: TranspoOpportunitySignal[];
  recommendedPlay: string;
  // Verification context, surfaced when a verification row exists.
  verificationScore?: number;
  verificationStatus?: TranspoVerificationStatus;
};

const SIGNAL_DEFS: Record<TranspoOpportunitySignalId, { label: string; weight: number }> = {
  active_authority: { label: "Active authority", weight: 25 },
  single_truck: { label: "Single truck", weight: 20 },
  small_fleet: { label: "Small fleet", weight: 15 },
  missing_website: { label: "No website", weight: 20 },
  missing_social: { label: "No social presence", weight: 10 },
  local_market: { label: "Local market", weight: 10 },
  no_google_business: { label: "No Google Business", weight: 20 },
  low_reviews: { label: "Low reviews", weight: 10 },
  no_website_verified: { label: "No verified website", weight: 20 },
  residential_address: { label: "Residential address", weight: 10 },
  po_box_address: { label: "PO Box address", weight: 20 },
  unverified_public_presence: { label: "Unverified presence", weight: 15 },
  verified_established: { label: "Verified established", weight: -10 },
  google_found_low_confidence: { label: "Google match low confidence", weight: 10 },
  google_has_website: { label: "Google website found", weight: -10 },
  google_strong_presence: { label: "Strong Google presence", weight: -15 },
  no_google_reviews: { label: "No Google reviews", weight: 10 },
  website_broken: { label: "Website broken", weight: 15 },
  parked_domain: { label: "Parked domain", weight: 25 },
  hiring_site_signal: { label: "Hiring on site", weight: 20 },
  owner_operator_site_signal: { label: "Owner-operator on site", weight: 20 },
  quote_request_present: { label: "Quote request on site", weight: -10 },
  no_contact_signal: { label: "No contact info on site", weight: 10 },
  new_state_entity: { label: "New state entity", weight: 25 },
  state_registry_not_found: { label: "State registry not found", weight: 10 },
  state_entity_inactive: { label: "State entity inactive", weight: 20 },
  strong_entity_match: { label: "Strong entity match", weight: -5 },
};

const SOCIAL_SOURCES: TranspoSource[] = ["linkedin", "facebook", "google_business"];

const SINGLE_TRUCK_MAX = 1;
const SMALL_FLEET_MIN = 2;
const SMALL_FLEET_MAX = 10;

// ── Detectors ───────────────────────────────────────────────────────────────

function isActiveAuthority(status?: string): boolean {
  const s = (status ?? "").trim().toLowerCase();
  if (!s) return false;
  return s === "a" || s.includes("active") || s.includes("authorized");
}

function hasWebsite(c: TranspoCarrierTarget): boolean {
  return Boolean((c.website ?? "").trim());
}

function hasSocialPresence(c: TranspoCarrierTarget): boolean {
  return (c.sources ?? []).some((s) => SOCIAL_SOURCES.includes(s));
}

function isLocalMarket(c: TranspoCarrierTarget): boolean {
  return Boolean((c.city ?? "").trim()) && Boolean((c.state ?? "").trim());
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// ── Recommended play ──────────────────────────────────────────────────────────

function recommendedPlayFor(ids: Set<TranspoOpportunitySignalId>): string {
  const single = ids.has("single_truck");
  const small = ids.has("small_fleet");

  // State-registry plays take top priority — formation/standing are concrete.
  if (ids.has("new_state_entity")) {
    return "New carrier launch package";
  }
  if (ids.has("state_entity_inactive")) {
    return "Compliance/entity cleanup";
  }
  if (ids.has("state_registry_not_found")) {
    return "Entity verification cleanup";
  }

  // Website-crawl plays — concrete, observed gaps.
  if (ids.has("parked_domain")) {
    return "Dead-domain replacement package";
  }
  if (ids.has("website_broken")) {
    return "Website repair / credibility rebuild";
  }
  if (ids.has("hiring_site_signal")) {
    return "Driver recruiting funnel";
  }
  if (ids.has("owner_operator_site_signal")) {
    return "Owner-operator recruiting funnel";
  }
  if (ids.has("no_contact_signal")) {
    return "Contact conversion cleanup";
  }

  // Verification-driven plays take priority — they reflect concrete gaps.
  if (ids.has("no_google_business") && ids.has("no_website_verified")) {
    return "Digital visibility launch — website + Google Business Profile";
  }
  if (ids.has("google_found_low_confidence")) {
    return "Listing cleanup — verify business name, address, and phone";
  }
  if (ids.has("no_google_reviews")) {
    return "Review generation package";
  }
  if (single && ids.has("residential_address")) {
    return "Owner-operator credibility package";
  }
  if (ids.has("po_box_address")) {
    return "Address trust and local presence verification";
  }
  if (ids.has("low_reviews")) {
    return "Review/reputation growth package";
  }
  if (ids.has("google_strong_presence")) {
    return "Established carrier expansion audit";
  }

  // Carrier-master fallbacks.
  const noWeb = ids.has("missing_website") || ids.has("no_website_verified");
  if (noWeb && single) return "Owner-operator web launch — website + Google Business Profile";
  if (noWeb && small) return "Small-fleet digital launch — website + lead capture";
  if (single) return "Owner-operator starter — branding + booking page";
  if (small) return "Small-fleet growth package — site + dispatch/marketing";
  if (noWeb) return "Website launch offer";
  if (ids.has("missing_social")) return "Social presence setup — LinkedIn / Google Business";

  if (ids.has("verified_established")) return "Established carrier expansion audit";
  if (ids.has("active_authority")) return "Active-authority nurture — monitor for growth";
  return "Monitor — insufficient opportunity signals";
}

// ── Scoring ──────────────────────────────────────────────────────────────────

/** Score a single carrier (+ optional verification) against all signals. */
export function scoreCarrierOpportunity(
  carrier: TranspoCarrierTarget,
  verification?: TranspoCarrierVerification,
): TranspoOpportunityRecord {
  const matched: TranspoOpportunitySignalId[] = [];

  if (isActiveAuthority(carrier.authorityStatus)) matched.push("active_authority");

  const fleet = typeof carrier.fleetSize === "number" ? carrier.fleetSize : undefined;
  if (fleet !== undefined) {
    if (fleet <= SINGLE_TRUCK_MAX && fleet >= 1) matched.push("single_truck");
    else if (fleet >= SMALL_FLEET_MIN && fleet <= SMALL_FLEET_MAX) matched.push("small_fleet");
  }

  if (!hasWebsite(carrier)) matched.push("missing_website");
  if (!hasSocialPresence(carrier)) matched.push("missing_social");
  if (isLocalMarket(carrier)) matched.push("local_market");

  // Verification-derived signals (only when a verification row is present).
  if (verification) {
    if (verification.googleFound === false) matched.push("no_google_business");
    if (verification.googleFound === true && (verification.googleReviewCount ?? 0) < 10) {
      matched.push("low_reviews");
    }
    if (verification.websiteFound === false) matched.push("no_website_verified");
    if (verification.addressType === "residential") matched.push("residential_address");
    if (verification.addressType === "po_box") matched.push("po_box_address");
    if (
      verification.verificationStatus === "not_found" ||
      verification.verificationScore < 20
    ) {
      matched.push("unverified_public_presence");
    }
    if (verification.verificationScore >= 60) matched.push("verified_established");

    // Google-enrichment signals.
    if (verification.googleFound === true && (verification.googleMatchConfidence ?? 1) < 0.45) {
      matched.push("google_found_low_confidence");
    }
    if ((verification.googleWebsite ?? "").trim()) matched.push("google_has_website");
    if (
      verification.googleFound === true &&
      (verification.googleRating ?? 0) >= 4 &&
      (verification.googleReviewCount ?? 0) >= 10
    ) {
      matched.push("google_strong_presence");
    }
    if (verification.googleFound === true && (verification.googleReviewCount ?? -1) === 0) {
      matched.push("no_google_reviews");
    }

    // Website-crawl signals.
    const wsig = new Set(verification.websiteSignals ?? []);
    if (verification.websiteFetchStatus === "failed" || wsig.has("broken_site")) {
      matched.push("website_broken");
    }
    if (wsig.has("parked_domain")) matched.push("parked_domain");
    if (verification.websiteHiringFound) matched.push("hiring_site_signal");
    if (verification.websiteOwnerOperatorFound) matched.push("owner_operator_site_signal");
    if (verification.websiteQuoteRequestFound) matched.push("quote_request_present");
    const crawled =
      verification.websiteFetchStatus === "fetched" || verification.websiteFetchStatus === "partial";
    const hasContact =
      wsig.has("contact_page_found") ||
      (verification.websiteExtractedPhones?.length ?? 0) > 0 ||
      (verification.websiteExtractedEmails?.length ?? 0) > 0;
    if (verification.websiteFound && crawled && !hasContact) {
      matched.push("no_contact_signal");
    }

    // State-registry signals.
    if (verification.stateEntityFound === true && (verification.entityAgeMonths ?? Infinity) <= 12) {
      matched.push("new_state_entity");
    }
    if (verification.stateEntityFound === false) matched.push("state_registry_not_found");
    if (verification.stateEntityFound === true && verification.entityGoodStanding === false) {
      matched.push("state_entity_inactive");
    }
    if ((verification.stateNameMatchConfidence ?? 0) >= 0.75) matched.push("strong_entity_match");
  }

  const signals: TranspoOpportunitySignal[] = matched.map((id) => ({
    id,
    label: SIGNAL_DEFS[id].label,
    weight: SIGNAL_DEFS[id].weight,
  }));

  const score = clamp(
    signals.reduce((sum, s) => sum + s.weight, 0),
    0,
    100,
  );
  const recommendedPlay = recommendedPlayFor(new Set(matched));

  return {
    ...carrier,
    score,
    signals,
    recommendedPlay,
    ...(verification
      ? {
          verificationScore: verification.verificationScore,
          verificationStatus: verification.verificationStatus,
        }
      : {}),
  };
}

/**
 * Build opportunity records for every carrier, sorted highest score first.
 * `verifications` (optional) is keyed by carrierId; matching rows add
 * public-presence signals to the score.
 */
export function buildOpportunities(
  carriers: TranspoCarrierTarget[],
  verifications?: Map<string, TranspoCarrierVerification> | TranspoCarrierVerification[],
): TranspoOpportunityRecord[] {
  const byId =
    verifications instanceof Map
      ? verifications
      : new Map((verifications ?? []).map((v) => [v.carrierId, v]));

  return carriers
    .map((c) => scoreCarrierOpportunity(c, byId.get(c.id)))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const fa = a.fleetSize ?? Number.MAX_SAFE_INTEGER;
      const fb = b.fleetSize ?? Number.MAX_SAFE_INTEGER;
      if (fa !== fb) return fa - fb;
      return Date.parse(b.updatedAt ?? "") - Date.parse(a.updatedAt ?? "");
    });
}
