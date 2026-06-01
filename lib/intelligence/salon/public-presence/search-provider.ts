// lib/intelligence/salon/public-presence/search-provider.ts
// Public web search via SerpAPI or Google Custom Search (no private IG scraping).

import type { SalonIdentityPacket } from "./types";
import { buildSalonSearchQueries } from "./identity-extractor";

const QUERY_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_QUERIES = 4;
const DEFAULT_MAX_RESULTS_PER_QUERY = 10;

export type SearchBackend = "serpapi" | "google_custom_search" | "disabled";

export type SearchResultRow = {
  query: string;
  title?: string;
  url: string;
  snippet?: string;
};

export type SalonSearchResponse = {
  ok: boolean;
  provider: SearchBackend;
  results: SearchResultRow[];
  message?: string;
  diagnostics: {
    queriesAttempted: number;
    queriesSucceeded: number;
    errors: string[];
  };
};

export function getSearchProviderStatus(): {
  provider: SearchBackend;
  connected: boolean;
  message: string;
} {
  if (process.env.SERPAPI_API_KEY?.trim()) {
    return {
      provider: "serpapi",
      connected: true,
      message: "SerpAPI connected",
    };
  }
  if (
    process.env.GOOGLE_CUSTOM_SEARCH_API_KEY?.trim() &&
    process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID?.trim()
  ) {
    return {
      provider: "google_custom_search",
      connected: true,
      message: "Google Custom Search connected",
    };
  }
  return {
    provider: "disabled",
    connected: false,
    message:
      "Public search provider not connected. Set SERPAPI_API_KEY or GOOGLE_CUSTOM_SEARCH_API_KEY + GOOGLE_CUSTOM_SEARCH_ENGINE_ID.",
  };
}

async function searchSerpApi(query: string): Promise<SearchResultRow[]> {
  const key = process.env.SERPAPI_API_KEY?.trim();
  if (!key) return [];

  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&num=10&api_key=${encodeURIComponent(key)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(QUERY_TIMEOUT_MS) });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    organic_results?: Array<{ title?: string; link?: string; snippet?: string }>;
  };

  return (data.organic_results ?? [])
    .filter((r) => r.link?.startsWith("http"))
    .slice(0, DEFAULT_MAX_RESULTS_PER_QUERY)
    .map((r) => ({
      query,
      title: r.title,
      url: r.link!,
      snippet: r.snippet,
    }));
}

async function searchGoogleCse(query: string): Promise<SearchResultRow[]> {
  const key = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY?.trim();
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID?.trim();
  if (!key || !cx) return [];

  const url =
    `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}` +
    `&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}&num=10`;

  const res = await fetch(url, { signal: AbortSignal.timeout(QUERY_TIMEOUT_MS) });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    items?: Array<{ title?: string; link?: string; snippet?: string }>;
  };

  return (data.items ?? [])
    .filter((r) => r.link?.startsWith("http"))
    .slice(0, DEFAULT_MAX_RESULTS_PER_QUERY)
    .map((r) => ({
      query,
      title: r.title,
      url: r.link!,
      snippet: r.snippet,
    }));
}

export async function searchSalonPublicPresence(
  identity: SalonIdentityPacket,
  options?: { maxQueries?: number; force?: boolean },
): Promise<SalonSearchResponse> {
  const status = getSearchProviderStatus();
  const diagnostics = {
    queriesAttempted: 0,
    queriesSucceeded: 0,
    errors: [] as string[],
  };

  if (status.provider === "disabled") {
    return {
      ok: false,
      provider: "disabled",
      results: [],
      message: status.message,
      diagnostics,
    };
  }

  const queries = (identity.searchQueries.length > 0
    ? identity.searchQueries
    : buildSalonSearchQueries(identity)
  ).slice(0, options?.maxQueries ?? DEFAULT_MAX_QUERIES);

  const results: SearchResultRow[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    diagnostics.queriesAttempted++;
    try {
      const rows =
        status.provider === "serpapi"
          ? await searchSerpApi(query)
          : await searchGoogleCse(query);
      if (rows.length > 0) diagnostics.queriesSucceeded++;
      for (const row of rows) {
        const key = row.url.toLowerCase().replace(/\/+$/, "");
        if (seen.has(key)) continue;
        seen.add(key);
        results.push(row);
      }
    } catch (e) {
      diagnostics.errors.push(
        `${query}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  return {
    ok: results.length > 0,
    provider: status.provider,
    results,
    message: results.length > 0 ? undefined : status.message,
    diagnostics,
  };
}
