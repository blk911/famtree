// Places API (New) — searchText + place details (salon google identity only).

import { getGoogleMapsApiKey } from "../google-identity-connection";
import type { GooglePlaceCandidate } from "./types";

const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const TIMEOUT_MS = 8000;
const MAX_CANDIDATES = 3;

const SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.rating",
  "places.userRatingCount",
  "places.businessStatus",
  "places.types",
].join(",");

const DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "nationalPhoneNumber",
  "websiteUri",
  "googleMapsUri",
  "rating",
  "userRatingCount",
  "businessStatus",
  "types",
].join(",");

type LocalizedText = { text?: string; languageCode?: string };

type NewPlaceResource = {
  id?: string;
  displayName?: LocalizedText;
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  types?: string[];
};

type GoogleApiErrorBody = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

function formatCategories(types?: string[]): string[] | undefined {
  if (!types?.length) return undefined;
  return types
    .filter((t) => t !== "point_of_interest" && t !== "establishment")
    .map((t) => t.replace(/_/g, " "));
}

export function normalizePlaceResourceId(id?: string): string | undefined {
  if (!id?.trim()) return undefined;
  const trimmed = id.trim();
  return trimmed.startsWith("places/") ? trimmed.slice("places/".length) : trimmed;
}

function placeResourceName(placeId: string): string {
  return placeId.startsWith("places/") ? placeId : `places/${placeId}`;
}

function formatApiError(
  context: string,
  status: number,
  body: GoogleApiErrorBody | undefined,
): string {
  const err = body?.error;
  const statusLabel = err?.status ?? "UNKNOWN";
  const message = err?.message ?? "No error message";
  return `Places API (New) ${context} HTTP ${status} (${statusLabel}): ${message}`;
}

async function placesNewRequest<T>(options: {
  method: "GET" | "POST";
  url: string;
  apiKey: string;
  fieldMask: string;
  body?: unknown;
}): Promise<{
  ok: boolean;
  status: number;
  data?: T;
  errorNote?: string;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(options.url, {
      method: options.method,
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": options.apiKey,
        "X-Goog-FieldMask": options.fieldMask,
      },
      body: options.body != null ? JSON.stringify(options.body) : undefined,
    });
    const raw = (await res.json().catch(() => ({}))) as T & GoogleApiErrorBody;
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        errorNote: formatApiError(options.method, res.status, raw as GoogleApiErrorBody),
      };
    }
    return { ok: true, status: res.status, data: raw as T };
  } catch (e) {
    const msg = e instanceof Error ? (e.name === "AbortError" ? "request timed out" : e.message) : String(e);
    return { ok: false, status: 0, errorNote: `Places API (New) ${options.method} failed: ${msg}` };
  } finally {
    clearTimeout(timer);
  }
}

export function mapNewPlaceToCandidate(place: NewPlaceResource): GooglePlaceCandidate | null {
  const placeId = normalizePlaceResourceId(place.id);
  if (!placeId) return null;
  return {
    placeId,
    name: place.displayName?.text,
    formattedAddress: place.formattedAddress,
    phone: place.nationalPhoneNumber,
    website: place.websiteUri,
    mapsUrl: place.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${placeId}`,
    rating: typeof place.rating === "number" ? place.rating : undefined,
    reviewCount: typeof place.userRatingCount === "number" ? place.userRatingCount : undefined,
    categories: formatCategories(place.types),
    permanentlyClosed: place.businessStatus === "CLOSED_PERMANENTLY",
    businessStatus: place.businessStatus,
  };
}

async function fetchPlaceDetailsNew(
  apiKey: string,
  placeId: string,
): Promise<{ place?: NewPlaceResource; note?: string }> {
  const resource = placeResourceName(placeId);
  const url = `https://places.googleapis.com/v1/${resource}`;
  const res = await placesNewRequest<NewPlaceResource>({
    method: "GET",
    url,
    apiKey,
    fieldMask: DETAILS_FIELD_MASK,
  });
  if (!res.ok) return { note: res.errorNote };
  return { place: res.data };
}

export async function lookupPlacesApiNew(
  input: { displayName: string; city?: string; state?: string },
  options?: { maxCandidates?: number },
): Promise<{ candidates: GooglePlaceCandidate[]; notes: string[] }> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return { candidates: [], notes: ["Google Places provider not connected. Set GOOGLE_MAPS_API_KEY."] };
  }

  const max = options?.maxCandidates ?? MAX_CANDIDATES;
  const loc = [input.city, input.state].filter(Boolean).join(" ").trim();
  const queries = [
    [input.displayName, loc, "salon"].filter(Boolean).join(" "),
    [input.displayName, loc].filter(Boolean).join(" "),
    input.displayName,
  ].filter((q) => q.trim());

  const notes: string[] = [];
  const seenIds = new Set<string>();
  const candidates: GooglePlaceCandidate[] = [];

  for (const textQuery of queries) {
    if (candidates.length >= max) break;

    const res = await placesNewRequest<{ places?: NewPlaceResource[] }>({
      method: "POST",
      url: SEARCH_URL,
      apiKey,
      fieldMask: SEARCH_FIELD_MASK,
      body: { textQuery, pageSize: max },
    });

    if (!res.ok) {
      if (res.errorNote) notes.push(res.errorNote);
      continue;
    }

    for (const row of res.data?.places ?? []) {
      if (candidates.length >= max) break;
      let mapped = mapNewPlaceToCandidate(row);
      if (!mapped) continue;
      if (seenIds.has(mapped.placeId)) continue;
      seenIds.add(mapped.placeId);

      const needsDetails =
        !mapped.phone || !mapped.website || !mapped.formattedAddress;
      if (needsDetails) {
        const details = await fetchPlaceDetailsNew(apiKey, mapped.placeId);
        if (details.note) notes.push(details.note);
        if (details.place) {
          const enriched = mapNewPlaceToCandidate({ ...row, ...details.place });
          if (enriched) mapped = enriched;
        }
      }

      candidates.push(mapped);
    }

    if (candidates.length > 0) break;
  }

  if (candidates.length === 0 && notes.length === 0) {
    notes.push("No Google Business candidates returned from Places API (New).");
  }

  return { candidates, notes };
}
