// lib/intelligence/transpo/opportunity-engine.ts
// Transpo Opportunity Signal Engine.
//
// Input:  Carrier Master records (TranspoCarrierTarget[])
// Output: Opportunity Records — each carrier scored against a set of
//         buy-signals, with the matched signals and a recommended sales play.
//
// Pure, deterministic, side-effect free: the API route reads the carrier master
// and runs these functions, so the engine stays trivially testable and reusable.

import type { TranspoCarrierTarget, TranspoSource } from "./types";

export type TranspoOpportunitySignalId =
  | "active_authority"
  | "small_fleet"
  | "single_truck"
  | "missing_website"
  | "missing_social"
  | "local_market";

export type TranspoOpportunitySignal = {
  id: TranspoOpportunitySignalId;
  label: string;
  weight: number;
};

export type TranspoOpportunityRecord = TranspoCarrierTarget & {
  score: number;
  signals: TranspoOpportunitySignal[];
  recommendedPlay: string;
};

// ── Signal weights ──────────────────────────────────────────────────────────
// Higher weight = stronger pull toward a high-intent, easy-to-win prospect.
// single_truck / small_fleet are mutually exclusive (a carrier is one or the
// other), so the practical max is ~85 — we do not normalize to 100.
const SIGNAL_DEFS: Record<TranspoOpportunitySignalId, { label: string; weight: number }> = {
  active_authority: { label: "Active authority", weight: 25 },
  single_truck: { label: "Single truck", weight: 20 },
  small_fleet: { label: "Small fleet", weight: 15 },
  missing_website: { label: "No website", weight: 20 },
  missing_social: { label: "No social presence", weight: 10 },
  local_market: { label: "Local market", weight: 10 },
};

const SOCIAL_SOURCES: TranspoSource[] = ["linkedin", "facebook", "google_business"];

const SINGLE_TRUCK_MAX = 1;
const SMALL_FLEET_MIN = 2;
const SMALL_FLEET_MAX = 10;

// ── Detectors ───────────────────────────────────────────────────────────────

function isActiveAuthority(status?: string): boolean {
  const s = (status ?? "").trim().toLowerCase();
  if (!s) return false;
  // FMCSA census uses short codes ("A" = active) plus free-text variants.
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

// ── Recommended play ──────────────────────────────────────────────────────────

function recommendedPlayFor(ids: Set<TranspoOpportunitySignalId>): string {
  const single = ids.has("single_truck");
  const small = ids.has("small_fleet");
  const noWeb = ids.has("missing_website");
  const noSocial = ids.has("missing_social");
  const active = ids.has("active_authority");

  if (noWeb && single) return "Owner-operator web launch — website + Google Business Profile";
  if (noWeb && small) return "Small-fleet digital launch — website + lead capture";
  if (single) return "Owner-operator starter — branding + booking page";
  if (small) return "Small-fleet growth package — site + dispatch/marketing";
  if (noWeb) return "Website launch offer";
  if (noSocial) return "Social presence setup — LinkedIn / Google Business";
  if (active) return "Active-authority nurture — monitor for growth";
  return "Monitor — insufficient opportunity signals";
}

// ── Scoring ──────────────────────────────────────────────────────────────────

/** Score a single carrier against all opportunity signals. */
export function scoreCarrierOpportunity(
  carrier: TranspoCarrierTarget,
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

  const signals: TranspoOpportunitySignal[] = matched.map((id) => ({
    id,
    label: SIGNAL_DEFS[id].label,
    weight: SIGNAL_DEFS[id].weight,
  }));

  const score = signals.reduce((sum, s) => sum + s.weight, 0);
  const recommendedPlay = recommendedPlayFor(new Set(matched));

  return { ...carrier, score, signals, recommendedPlay };
}

/**
 * Build opportunity records for every carrier, sorted highest score first.
 * Ties break by larger fleet last (smaller, more-winnable carriers float up),
 * then by most-recently-updated.
 */
export function buildOpportunities(
  carriers: TranspoCarrierTarget[],
): TranspoOpportunityRecord[] {
  return carriers
    .map(scoreCarrierOpportunity)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const fa = a.fleetSize ?? Number.MAX_SAFE_INTEGER;
      const fb = b.fleetSize ?? Number.MAX_SAFE_INTEGER;
      if (fa !== fb) return fa - fb;
      return Date.parse(b.updatedAt ?? "") - Date.parse(a.updatedAt ?? "");
    });
}
