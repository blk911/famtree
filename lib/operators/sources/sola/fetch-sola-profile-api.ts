// lib/operators/sources/sola/fetch-sola-profile-api.ts

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { extractProfileSlug } from "./profile-url-utils";
import {
  parseSolaProfileApi,
  parsedApiHasSignal,
  type ParsedSolaProfileApi,
} from "./parse-sola-profile-api";
import { normalizeSolaProfileUrl } from "./profile-url-utils";

const SOLA_DATA_DIR = path.join(process.cwd(), "runtime-data", "sola");

export const PROFILE_API_ENDPOINTS_PATH = path.join(
  SOLA_DATA_DIR,
  "sola-profile-api-endpoints.generated.json",
);

const API_BASE =
  "https://mysiteapi.vagaro.com/us02/api/v2/businesslogincustomerdetails/businesslocationasync";

export type SolaProfileApiStatus = "ok" | "failed" | "not_available";

export interface SolaProfileApiFetchResult {
  profileUrl: string;
  apiEndpoint?: string;
  apiFetchedAt: string;
  apiStatus: SolaProfileApiStatus;
  parsed: ParsedSolaProfileApi;
  rawJson?: unknown;
  error?: string;
}

export interface SolaProfileApiEndpointsArtifact {
  generatedAt: string;
  endpointsByProfileUrl: Record<string, string>;
}

function vagaroUrlCandidates(profileSlug: string): string[] {
  const compact = profileSlug.replace(/-/g, "");
  const candidates = [profileSlug, compact, profileSlug.split("-")[0]];
  return Array.from(new Set(candidates.filter(Boolean)));
}

export function buildSolaProfileApiEndpoint(opts: {
  vagaroURL?: string;
  encMerchantID?: string;
}): string {
  const params = new URLSearchParams({
    SiteName: "book.solasalonstudios.com",
    VagaroURL: opts.vagaroURL ?? "",
    UserId: "",
    EncMerchantID: opts.encMerchantID ?? "",
  });
  return `${API_BASE}?${params.toString()}`;
}

export function deriveProfileApiEndpoints(profileUrl: string): string[] {
  const slug = extractProfileSlug(profileUrl);
  if (!slug) return [];

  const endpoints = vagaroUrlCandidates(slug).map((vagaroURL) =>
    buildSolaProfileApiEndpoint({ vagaroURL }),
  );
  endpoints.push(buildSolaProfileApiEndpoint({ encMerchantID: "" }));
  return Array.from(new Set(endpoints));
}

async function fetchJson(endpoint: string): Promise<unknown> {
  const response = await fetch(endpoint, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`API HTTP ${response.status}`);
  }
  return response.json();
}

function responseHasData(json: unknown): boolean {
  if (!json || typeof json !== "object") return false;
  const record = json as Record<string, unknown>;
  const data = record.data ?? record.Data;
  return Array.isArray(data) && data.length > 0;
}

export async function readProfileApiEndpointCache(): Promise<Record<string, string>> {
  try {
    const raw = await readFile(PROFILE_API_ENDPOINTS_PATH, "utf8");
    const parsed = JSON.parse(raw) as SolaProfileApiEndpointsArtifact;
    return parsed.endpointsByProfileUrl ?? {};
  } catch {
    return {};
  }
}

export async function writeProfileApiEndpointCache(
  updates: Record<string, string>,
): Promise<SolaProfileApiEndpointsArtifact> {
  const existing = await readProfileApiEndpointCache();
  const endpointsByProfileUrl = { ...existing, ...updates };
  const artifact: SolaProfileApiEndpointsArtifact = {
    generatedAt: new Date().toISOString(),
    endpointsByProfileUrl,
  };
  await mkdir(SOLA_DATA_DIR, { recursive: true });
  await writeFile(
    PROFILE_API_ENDPOINTS_PATH,
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );
  return artifact;
}

export async function fetchSolaProfileApi(
  profileUrl: string,
  knownEndpoint?: string,
): Promise<SolaProfileApiFetchResult> {
  const normalizedUrl = normalizeSolaProfileUrl(profileUrl) ?? profileUrl.trim();
  const apiFetchedAt = new Date().toISOString();
  const emptyParsed = parseSolaProfileApi(null, normalizedUrl);

  const endpoints: string[] = [];
  if (knownEndpoint?.trim()) endpoints.push(knownEndpoint.trim());
  endpoints.push(...deriveProfileApiEndpoints(normalizedUrl));

  const tried = new Set<string>();
  for (const endpoint of endpoints) {
    if (tried.has(endpoint)) continue;
    tried.add(endpoint);

    try {
      const rawJson = await fetchJson(endpoint);
      if (!responseHasData(rawJson)) continue;

      const parsed = parseSolaProfileApi(rawJson, normalizedUrl);
      if (!parsedApiHasSignal(parsed)) continue;

      return {
        profileUrl: normalizedUrl,
        apiEndpoint: endpoint,
        apiFetchedAt,
        apiStatus: "ok",
        parsed,
        rawJson,
      };
    } catch {
      // try next endpoint candidate
    }
  }

  return {
    profileUrl: normalizedUrl,
    apiEndpoint: knownEndpoint,
    apiFetchedAt,
    apiStatus: knownEndpoint || endpoints.length ? "failed" : "not_available",
    parsed: emptyParsed,
    error: "No profile API endpoint returned usable data",
  };
}
