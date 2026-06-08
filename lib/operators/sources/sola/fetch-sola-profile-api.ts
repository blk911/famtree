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

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 1;

export type SolaProfileApiStatus = "ok" | "failed" | "not_available";

export type SolaProfileApiErrorType =
  | "timeout"
  | "http_error"
  | "no_data"
  | "no_signal"
  | "network_error"
  | "unknown";

export interface SolaProfileApiFetchOptions {
  timeoutMs?: number;
  retries?: number;
}

export interface SolaProfileApiFetchResult {
  profileUrl: string;
  apiEndpoint?: string;
  endpointUrl?: string;
  apiFetchedAt: string;
  apiStatus: SolaProfileApiStatus;
  parsed: ParsedSolaProfileApi;
  rawJson?: unknown;
  error?: string;
  durationMs: number;
  errorType?: SolaProfileApiErrorType;
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

function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === "AbortError" || /abort/i.test(error.message);
}

function classifyFetchError(error: unknown): { errorType: SolaProfileApiErrorType; message: string } {
  if (isAbortError(error)) {
    return { errorType: "timeout", message: "timeout" };
  }
  if (error instanceof Error) {
    if (/HTTP \d+/i.test(error.message)) {
      return { errorType: "http_error", message: error.message };
    }
    if (/fetch failed|ECONN|ENOTFOUND|ETIMEDOUT|network/i.test(error.message)) {
      return { errorType: "network_error", message: error.message };
    }
    return { errorType: "unknown", message: error.message };
  }
  return { errorType: "unknown", message: String(error) };
}

function shouldRetry(errorType: SolaProfileApiErrorType): boolean {
  return errorType === "timeout" || errorType === "network_error";
}

async function fetchJson(endpoint: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`API HTTP ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timer);
  }
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
  options?: SolaProfileApiFetchOptions,
): Promise<SolaProfileApiFetchResult> {
  const startedAt = Date.now();
  const normalizedUrl = normalizeSolaProfileUrl(profileUrl) ?? profileUrl.trim();
  const apiFetchedAt = new Date().toISOString();
  const emptyParsed = parseSolaProfileApi(null, normalizedUrl);
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = Math.max(0, options?.retries ?? DEFAULT_RETRIES);

  const endpoints: string[] = [];
  if (knownEndpoint?.trim()) endpoints.push(knownEndpoint.trim());
  endpoints.push(...deriveProfileApiEndpoints(normalizedUrl));

  const tried = new Set<string>();
  let lastEndpoint: string | undefined;
  let lastError = "No profile API endpoint returned usable data";
  let lastErrorType: SolaProfileApiErrorType = "no_data";

  for (const endpoint of endpoints) {
    if (tried.has(endpoint)) continue;
    tried.add(endpoint);
    lastEndpoint = endpoint;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const rawJson = await fetchJson(endpoint, timeoutMs);
        if (!responseHasData(rawJson)) {
          lastError = "API response had no data rows";
          lastErrorType = "no_data";
          break;
        }

        const parsed = parseSolaProfileApi(rawJson, normalizedUrl);
        if (!parsedApiHasSignal(parsed)) {
          lastError = "API response had no usable profile signals";
          lastErrorType = "no_signal";
          break;
        }

        return {
          profileUrl: normalizedUrl,
          apiEndpoint: endpoint,
          endpointUrl: endpoint,
          apiFetchedAt,
          apiStatus: "ok",
          parsed,
          rawJson,
          durationMs: Date.now() - startedAt,
        };
      } catch (error) {
        const classified = classifyFetchError(error);
        lastError = classified.message;
        lastErrorType = classified.errorType;
        if (attempt < maxRetries && shouldRetry(classified.errorType)) {
          continue;
        }
        break;
      }
    }
  }

  const durationMs = Date.now() - startedAt;
  const hasEndpoints = Boolean(knownEndpoint || endpoints.length);

  return {
    profileUrl: normalizedUrl,
    apiEndpoint: lastEndpoint ?? knownEndpoint,
    endpointUrl: lastEndpoint,
    apiFetchedAt,
    apiStatus: hasEndpoints ? "failed" : "not_available",
    parsed: emptyParsed,
    error: lastErrorType === "timeout" ? "timeout" : lastError,
    durationMs,
    errorType: hasEndpoints ? lastErrorType : undefined,
  };
}
