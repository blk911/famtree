// lib/intelligence/transpo/verification/providers/google-business-provider.ts
// Google Business verification via the Google Places API (Text Search + Place
// Details). Live when GOOGLE_MAPS_API_KEY is set; otherwise a placeholder. Never
// throws — any error degrades to googleFound:false with a diagnostic note.

import type { TranspoCarrierTarget } from "../../types";
import type { TranspoCarrierVerification } from "../../verification-types";

const TEXT_SEARCH = "https://maps.googleapis.com/maps/api/place/textsearch/json";
const PLACE_DETAILS = "https://maps.googleapis.com/maps/api/place/details/json";
const DETAILS_FIELDS =
  "name,formatted_address,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,types,url";
const TIMEOUT_MS = 8000;

const TRUCKING_RE =
  /\b(truck|trucking|logistics|freight|transport|transportation|moving|haul|hauling|carrier|cargo|dispatch|supply|distribution|terminal|warehouse)\b/i;

export function isGoogleProviderConnected(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY?.trim());
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tokenize(value: string | undefined | null): string[] {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/** Fraction of the carrier's name tokens present in the candidate name (0–1). */
function nameOverlap(carrierName: string, candidateName: string): number {
  const a = tokenize(carrierName);
  const b = new Set(tokenize(candidateName));
  if (a.length === 0) return 0;
  const hits = a.filter((t) => b.has(t)).length;
  return hits / a.length;
}

function normalizePhone(value: string | undefined | null): string {
  return (value ?? "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
}

async function fetchJson(url: string): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true, data: await res.json() };
  } catch (e) {
    const msg = e instanceof Error ? (e.name === "AbortError" ? "request timed out" : e.message) : String(e);
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

type PlaceSearchResult = {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
};

type PlaceDetails = PlaceSearchResult & {
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  url?: string;
};

function carrierAddress(carrier: TranspoCarrierTarget): string {
  return ((carrier as { address?: string }).address ?? "").trim();
}

function computeConfidence(
  carrier: TranspoCarrierTarget,
  details: PlaceDetails,
): { confidence: number; matchedBy: NonNullable<TranspoCarrierVerification["googleMatchedBy"]>; phoneMatched: boolean } {
  let score = 0;

  // Name similarity (up to 0.35).
  score += nameOverlap(carrier.companyName, details.name ?? "") * 0.35;

  // City / state / address present in the formatted address (up to 0.25).
  const addr = (details.formatted_address ?? "").toLowerCase();
  const locHits =
    [carrier.city, carrier.state, carrierAddress(carrier)]
      .filter((p) => p && p.trim())
      .filter((p) => addr.includes((p as string).toLowerCase())).length;
  if (locHits > 0) score += Math.min(0.25, 0.125 * locHits);

  // Phone match (0.25) when both sides have a phone.
  const carrierPhone = normalizePhone(carrier.phone);
  const placePhone = normalizePhone(details.formatted_phone_number || details.international_phone_number);
  const phoneMatched = Boolean(carrierPhone && placePhone && carrierPhone === placePhone);
  if (phoneMatched) score += 0.25;

  // Category match (0.15).
  const catText = `${(details.types ?? []).join(" ")} ${details.name ?? ""}`;
  if (TRUCKING_RE.test(catText)) score += 0.15;

  const confidence = Math.max(0, Math.min(1, score));

  const matchedBy: NonNullable<TranspoCarrierVerification["googleMatchedBy"]> = phoneMatched
    ? "phone"
    : carrierAddress(carrier) && addr.includes(carrierAddress(carrier).toLowerCase())
      ? "name_address"
      : locHits > 0
        ? "name_city_state"
        : "unknown";

  return { confidence, matchedBy, phoneMatched };
}

function primaryCategory(types?: string[]): string | undefined {
  if (!types || types.length === 0) return undefined;
  const meaningful = types.find((t) => t !== "point_of_interest" && t !== "establishment");
  return (meaningful ?? types[0]).replace(/_/g, " ");
}

// ── Provider ──────────────────────────────────────────────────────────────────

export async function verifyWithGoogleBusiness(
  carrier: TranspoCarrierTarget,
): Promise<Partial<TranspoCarrierVerification>> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

  if (!apiKey) {
    return {
      googleFound: false,
      notes: ["Google Business provider not connected. Set GOOGLE_MAPS_API_KEY."],
      providersChecked: ["google_business"],
    };
  }

  try {
    // Build candidate queries: name+city+state, then name+address+city+state.
    const loc = [carrier.city, carrier.state].filter(Boolean).join(" ");
    const address = carrierAddress(carrier);
    const queries = [
      [carrier.companyName, loc].filter(Boolean).join(" "),
      ...(address ? [[carrier.companyName, address, loc].filter(Boolean).join(" ")] : []),
    ].filter((q) => q.trim());

    let first: PlaceSearchResult | undefined;
    for (const q of queries) {
      const url = `${TEXT_SEARCH}?query=${encodeURIComponent(q)}&key=${apiKey}`;
      const res = await fetchJson(url);
      if (!res.ok) {
        return {
          googleFound: false,
          notes: [`Google Business lookup failed: ${res.error ?? "unknown error"}`],
          providersChecked: ["google_business"],
        };
      }
      const body = res.data as { status?: string; error_message?: string; results?: PlaceSearchResult[] };
      if (body.status === "REQUEST_DENIED" || body.status === "INVALID_REQUEST") {
        return {
          googleFound: false,
          notes: [`Google Business lookup rejected: ${body.error_message || body.status}`],
          providersChecked: ["google_business"],
        };
      }
      if (body.results && body.results.length > 0) {
        first = body.results[0];
        break;
      }
    }

    if (!first || !first.place_id) {
      return {
        googleFound: false,
        notes: ["No Google Business result found for this carrier."],
        providersChecked: ["google_business"],
      };
    }

    // Enrich with Place Details (phone/website not returned by Text Search).
    let details: PlaceDetails = { ...first };
    const detailsUrl = `${PLACE_DETAILS}?place_id=${encodeURIComponent(first.place_id)}&fields=${encodeURIComponent(DETAILS_FIELDS)}&key=${apiKey}`;
    const dRes = await fetchJson(detailsUrl);
    if (dRes.ok) {
      const dBody = dRes.data as { status?: string; result?: PlaceDetails };
      if (dBody.result) details = { ...details, ...dBody.result };
    }

    const { confidence, matchedBy } = computeConfidence(carrier, details);
    const phone = details.formatted_phone_number || details.international_phone_number || undefined;
    const mapsUrl = details.url || `https://www.google.com/maps/place/?q=place_id:${first.place_id}`;

    const notes: string[] = [
      `Google match: ${details.name ?? "(unnamed)"} (${Math.round(confidence * 100)}% confidence, by ${matchedBy}).`,
    ];
    if (confidence < 0.45) notes.push("Google result found but match confidence is low.");

    return {
      googleFound: true,
      googleRating: typeof details.rating === "number" ? details.rating : undefined,
      googleReviewCount: typeof details.user_ratings_total === "number" ? details.user_ratings_total : undefined,
      googleWebsite: details.website || undefined,
      googlePhone: phone,
      googlePlaceId: first.place_id,
      googleMapsUrl: mapsUrl,
      googleAddress: details.formatted_address || undefined,
      googleBusinessName: details.name || undefined,
      googleCategory: primaryCategory(details.types),
      googleMatchConfidence: confidence,
      googleMatchedBy: matchedBy,
      notes,
      providersChecked: ["google_business"],
    };
  } catch (e) {
    return {
      googleFound: false,
      notes: [`Google Business lookup failed: ${e instanceof Error ? e.message : String(e)}`],
      providersChecked: ["google_business"],
    };
  }
}
