// Google Places Text Search + Place Details (GOOGLE_MAPS_API_KEY).
// Salon-only — does not import Transpo modules.

import { getGoogleMapsApiKey } from "../google-identity-connection";
import type {
  GooglePlaceCandidate,
  GooglePlaceLookupInput,
  GooglePlaceLookupResult,
  SalonGoogleDataSource,
} from "./types";

const TEXT_SEARCH = "https://maps.googleapis.com/maps/api/place/textsearch/json";
const PLACE_DETAILS = "https://maps.googleapis.com/maps/api/place/details/json";
const DETAILS_FIELDS =
  "name,formatted_address,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,types,url,business_status";
const TIMEOUT_MS = 8000;
const MAX_CANDIDATES = 3;

type PlaceSearchResult = {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  business_status?: string;
};

type PlaceDetails = PlaceSearchResult & {
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  url?: string;
};

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

function formatCategories(types?: string[]): string[] | undefined {
  if (!types?.length) return undefined;
  return types
    .filter((t) => t !== "point_of_interest" && t !== "establishment")
    .map((t) => t.replace(/_/g, " "));
}

export class GooglePlacesApiDataSource implements SalonGoogleDataSource {
  readonly id = "google_places_api";

  isConnected(): boolean {
    return Boolean(getGoogleMapsApiKey());
  }

  async lookup(input: GooglePlaceLookupInput): Promise<GooglePlaceLookupResult> {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) {
      return {
        connected: false,
        candidates: [],
        notes: ["Google Places provider not connected. Set GOOGLE_MAPS_API_KEY."],
      };
    }

    const loc = [input.city, input.state].filter(Boolean).join(" ").trim();
    const queries = [
      [input.displayName, loc, "salon"].filter(Boolean).join(" "),
      [input.displayName, loc].filter(Boolean).join(" "),
      input.displayName,
    ].filter((q) => q.trim());

    const notes: string[] = [];
    const seenIds = new Set<string>();
    const candidates: GooglePlaceCandidate[] = [];

    for (const q of queries) {
      if (candidates.length >= MAX_CANDIDATES) break;
      const url = `${TEXT_SEARCH}?query=${encodeURIComponent(q)}&key=${apiKey}`;
      const res = await fetchJson(url);
      if (!res.ok) {
        notes.push(`Text search failed: ${res.error ?? "unknown"}`);
        continue;
      }
      const body = res.data as {
        status?: string;
        error_message?: string;
        results?: PlaceSearchResult[];
      };
      if (body.status === "REQUEST_DENIED" || body.status === "INVALID_REQUEST") {
        notes.push(`Google rejected query: ${body.error_message || body.status}`);
        break;
      }
      for (const row of body.results ?? []) {
        if (!row.place_id || seenIds.has(row.place_id)) continue;
        seenIds.add(row.place_id);

        let details: PlaceDetails = { ...row };
        const detailsUrl =
          `${PLACE_DETAILS}?place_id=${encodeURIComponent(row.place_id)}` +
          `&fields=${encodeURIComponent(DETAILS_FIELDS)}&key=${apiKey}`;
        const dRes = await fetchJson(detailsUrl);
        if (dRes.ok) {
          const dBody = dRes.data as { result?: PlaceDetails };
          if (dBody.result) details = { ...details, ...dBody.result };
        }

        const phone =
          details.formatted_phone_number || details.international_phone_number || undefined;
        candidates.push({
          placeId: row.place_id,
          name: details.name,
          formattedAddress: details.formatted_address,
          phone,
          website: details.website,
          mapsUrl:
            details.url || `https://www.google.com/maps/place/?q=place_id:${row.place_id}`,
          rating: typeof details.rating === "number" ? details.rating : undefined,
          reviewCount:
            typeof details.user_ratings_total === "number"
              ? details.user_ratings_total
              : undefined,
          categories: formatCategories(details.types),
          permanentlyClosed: details.business_status === "CLOSED_PERMANENTLY",
          businessStatus: details.business_status,
        });
        if (candidates.length >= MAX_CANDIDATES) break;
      }
      if (candidates.length > 0) break;
    }

    if (candidates.length === 0) {
      notes.push("No Google Business candidates returned for prospect queries.");
    }

    return { connected: true, candidates, notes };
  }
}

let _defaultSource: SalonGoogleDataSource | null = null;

export function getSalonGoogleDataSource(): SalonGoogleDataSource {
  if (!_defaultSource) _defaultSource = new GooglePlacesApiDataSource();
  return _defaultSource;
}

export { isSalonGoogleDataSourceConnected } from "../google-identity-connection";
