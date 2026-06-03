// Salon Google Places adapter — defaults to Places API (New), optional legacy fallback.

import { getGoogleMapsApiKey } from "../google-identity-connection";
import { lookupPlacesApiLegacy } from "./places-api-legacy";
import { lookupPlacesApiNew } from "./places-api-new";
import type {
  GooglePlaceCandidate,
  GooglePlaceLookupInput,
  GooglePlaceLookupResult,
  SalonGoogleDataSource,
} from "./types";

function legacyFallbackEnabled(): boolean {
  const flag = process.env.SALON_GOOGLE_PLACES_LEGACY_FALLBACK?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

export class GooglePlacesApiDataSource implements SalonGoogleDataSource {
  readonly id = "google_places_api_new";

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

    const notes: string[] = [];
    let candidates: GooglePlaceCandidate[] = [];

    const primary = await lookupPlacesApiNew(input);
    notes.push(...primary.notes);
    candidates = primary.candidates;

    if (candidates.length === 0 && legacyFallbackEnabled()) {
      notes.push("Places API (New) returned no candidates; trying legacy fallback.");
      const legacy = await lookupPlacesApiLegacy(input);
      notes.push(...legacy.notes);
      candidates = legacy.candidates;
    }

    if (candidates.length === 0 && notes.length === 0) {
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
