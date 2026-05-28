import fs from "node:fs/promises";
import path from "node:path";
import type { StyleSeatCategory, StyleSeatOperator } from "./types";

const DEBUG_ROOT = process.env.VERCEL
  ? "/tmp/studios-styleseat/debug"
  : path.join(process.cwd(), "runtime-data", "studios", "styleseat", "debug");

const SEARCH_API_PATTERN = "https://search.styleseat.com/api/v3.0/salons.json";

const MARKET_COORDINATES: Record<string, { lat: number; lon: number; label: string }> = {
  "atlanta-ga": { lat: 33.749, lon: -84.388, label: "Atlanta, GA" },
  "denver-co": { lat: 39.7392, lon: -104.9903, label: "Denver, CO" },
  "houston-tx": { lat: 29.7604, lon: -95.3698, label: "Houston, TX" },
  "las-vegas-nv": { lat: 36.1699, lon: -115.1398, label: "Las Vegas, NV" },
  "miami-fl": { lat: 25.7617, lon: -80.1918, label: "Miami, FL" },
  "new-york-ny": { lat: 40.7128, lon: -74.006, label: "New York, NY" },
};

const CATEGORY_ALIASES: Record<string, StyleSeatCategory> = {
  hair: "hair",
  "hair-salons": "hair",
  "hair-stylists": "hair",
  braids: "braids",
  braiders: "braids",
  barber: "barber",
  barbers: "barber",
  locs: "locs",
  "loc-stylists": "locs",
  makeup: "makeup",
  "makeup-artists": "makeup",
  lashes: "lashes",
  "lash-artists": "lashes",
  brows: "brows",
  "brow-artists": "brows",
  nails: "nails",
  "nail-technicians": "nails",
  extensions: "extensions",
  "hair-extensions": "extensions",
  "hair-extension-specialists": "extensions",
};

export type StyleSeatInternalApiInput = {
  sourceUrl: string;
  city?: string;
  state?: string;
  category?: string;
  categories?: string[];
  maxOperators?: number;
  debug?: boolean;
  runId?: string;
  discoveryMode?: StyleSeatOperator["discoveryMode"];
};

export type ParsedStyleSeatSearchUrl = {
  city: string;
  state: string;
  categorySlug: string;
  category: string;
  categoryKey: StyleSeatCategory;
  marketSlug: string;
  loc: string;
  lat: number;
  lon: number;
};

export type StyleSeatRawRecord = StyleSeatOperator;

export type StyleSeatInternalApiResult = {
  records: StyleSeatRawRecord[];
  apiUrlsTried: string[];
  apiUrlsSucceeded: string[];
  apiUrlsFailed: Array<{ url: string; status?: number; error?: string }>;
  diagnostics: {
    networkHintCount: number;
    selectedApiPattern?: string;
    resultCount: number;
    debugArtifactPath?: string;
  };
};

function titleCase(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function numberValue(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function normalizeStyleSeatCategorySlug(slug: string): StyleSeatCategory {
  const clean = slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return CATEGORY_ALIASES[clean] ?? CATEGORY_ALIASES[clean.replace(/s$/, "")] ?? "hair";
}

export function parseStyleSeatSearchUrl(url: string): ParsedStyleSeatSearchUrl | null {
  const parsed = new URL(url);
  const pathname = parsed.pathname.replace(/\/+$/, "");
  const match = pathname.match(/^\/m\/search\/([^/]+)\/([^/]+)$/i);
  if (!match) return null;

  const marketSlug = decodeURIComponent(match[1]).toLowerCase();
  const categorySlug = decodeURIComponent(match[2]).toLowerCase();
  const marketParts = marketSlug.split("-").filter(Boolean);
  const state = (marketParts.at(-1) ?? "").toUpperCase();
  const city = titleCase(marketParts.slice(0, -1).join(" "));
  const categoryKey = normalizeStyleSeatCategorySlug(categorySlug);
  const category = titleCase(categoryKey);
  const coords = MARKET_COORDINATES[marketSlug] ?? { lat: 0, lon: 0, label: [city, state].filter(Boolean).join(", ") };

  return {
    city,
    state,
    categorySlug,
    category,
    categoryKey,
    marketSlug,
    loc: coords.label,
    lat: coords.lat,
    lon: coords.lon,
  };
}

function getRunDebugDir(runId?: string): string | null {
  return runId ? path.join(DEBUG_ROOT, runId) : null;
}

function categoryFromInput(input: StyleSeatInternalApiInput, parsed: ParsedStyleSeatSearchUrl | null): StyleSeatCategory {
  if (input.category) return normalizeStyleSeatCategorySlug(input.category);
  const firstCategory = input.categories?.[0];
  if (firstCategory) return normalizeStyleSeatCategorySlug(firstCategory);
  return parsed?.categoryKey ?? "hair";
}

function queryFromCategory(category: string): string {
  return category.replace(/[-_]+/g, " ").replace(/\bsalons?\b/gi, "").trim() || "hair";
}

export function discoverStyleSeatInternalApiHints(input: StyleSeatInternalApiInput): {
  parsedSearch: ParsedStyleSeatSearchUrl | null;
  apiUrls: string[];
  selectedApiPattern?: string;
  networkHintCount: number;
  note?: string;
} {
  const parsedSearch = parseStyleSeatSearchUrl(input.sourceUrl);
  const category = input.category ?? parsedSearch?.categorySlug ?? input.categories?.[0] ?? "hair";
  const marketSlug = parsedSearch?.marketSlug
    ?? [input.city, input.state].filter(Boolean).join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const coords = parsedSearch
    ?? (marketSlug ? {
      city: input.city ?? "",
      state: input.state ?? "",
      categorySlug: category,
      category: titleCase(normalizeStyleSeatCategorySlug(category)),
      categoryKey: normalizeStyleSeatCategorySlug(category),
      marketSlug,
      loc: MARKET_COORDINATES[marketSlug]?.label ?? [input.city, input.state].filter(Boolean).join(", "),
      lat: MARKET_COORDINATES[marketSlug]?.lat ?? 0,
      lon: MARKET_COORDINATES[marketSlug]?.lon ?? 0,
    } satisfies ParsedStyleSeatSearchUrl : null);

  if (!coords?.lat || !coords.lon) {
    return {
      parsedSearch,
      apiUrls: [],
      networkHintCount: 0,
      note: `No internal API coordinates configured for ${marketSlug || input.sourceUrl}`,
    };
  }

  const params = new URLSearchParams({
    query: queryFromCategory(category),
    loc: coords.loc,
    lat: String(coords.lat),
    lon: String(coords.lon),
    size: String(input.maxOperators ?? 25),
    from: "0",
    date: new Date().toISOString().slice(0, 10),
  });
  const apiUrl = `${SEARCH_API_PATTERN}?${params.toString()}`;
  return {
    parsedSearch: coords,
    apiUrls: [apiUrl],
    selectedApiPattern: SEARCH_API_PATTERN,
    networkHintCount: 1,
  };
}

export async function fetchStyleSeatSearchApi(input: StyleSeatInternalApiInput): Promise<{
  data: Record<string, unknown>[];
  apiUrlsTried: string[];
  apiUrlsSucceeded: string[];
  apiUrlsFailed: Array<{ url: string; status?: number; error?: string }>;
  selectedApiPattern?: string;
  parsedSearch: ParsedStyleSeatSearchUrl | null;
  networkHintCount: number;
}> {
  const hints = discoverStyleSeatInternalApiHints(input);
  const apiUrlsTried: string[] = [];
  const apiUrlsSucceeded: string[] = [];
  const apiUrlsFailed: Array<{ url: string; status?: number; error?: string }> = [];
  const data: Record<string, unknown>[] = [];

  for (const apiUrl of hints.apiUrls) {
    apiUrlsTried.push(apiUrl);
    try {
      const res = await fetch(apiUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AIH StyleSeat Discovery/1.0)",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) {
        apiUrlsFailed.push({ url: apiUrl, status: res.status, error: `HTTP ${res.status}` });
        continue;
      }
      const json = await res.json() as { results?: Record<string, unknown>[] };
      const results = Array.isArray(json.results) ? json.results : [];
      data.push(...results);
      apiUrlsSucceeded.push(apiUrl);
    } catch (e) {
      apiUrlsFailed.push({ url: apiUrl, error: e instanceof Error ? e.message : String(e) });
    }
  }

  if (hints.note && apiUrlsTried.length === 0) {
    apiUrlsFailed.push({ url: input.sourceUrl, error: hints.note });
  }

  return {
    data,
    apiUrlsTried,
    apiUrlsSucceeded,
    apiUrlsFailed,
    selectedApiPattern: hints.selectedApiPattern,
    parsedSearch: hints.parsedSearch,
    networkHintCount: hints.networkHintCount,
  };
}

export function mapStyleSeatApiResultToRawRecord(input: {
  item: Record<string, unknown>;
  sourceUrl: string;
  index: number;
  category: StyleSeatCategory;
  parsedSearch: ParsedStyleSeatSearchUrl | null;
  discoveryMode?: StyleSeatOperator["discoveryMode"];
  batchId?: string;
}): StyleSeatRawRecord {
  const item = input.item;
  const salon = recordValue(item.matched_salon);
  const location = recordValue(salon.location);
  const id = stringValue(item.id) || stringValue(item.providerId) || stringValue(item.professionalId) || `api-${input.index + 1}`;
  const vanity = stringValue(item.vanity_url);
  const profileUrl = vanity
    ? `https://www.styleseat.com/m/v/${vanity}`
    : `https://www.styleseat.com/m/p/${id}`;
  const name = stringValue(item.name) || stringValue(item["0_name"]) || stringValue(item.provider_name) || stringValue(salon.name) || vanity || id;
  const city = stringValue(location.city) || input.parsedSearch?.city || "";
  const state = stringValue(location.state) || input.parsedSearch?.state || "";
  const serviceNames = Array.isArray(item.matched_services)
    ? item.matched_services.flatMap((service) => {
        const record = recordValue(service);
        return stringValue(record.name) ? [stringValue(record.name)] : [];
      })
    : [];
  const rawText = JSON.stringify(item).slice(0, 5000);
  const categories = Array.from(new Set([
    input.category,
    ...serviceNames.flatMap((service) => {
      const lower = service.toLowerCase();
      return Object.entries(CATEGORY_ALIASES).flatMap(([alias, category]) => lower.includes(alias.replace(/-/g, " ")) ? [category] : []);
    }),
  ])).slice(0, 8);

  return {
    styleseatId: `ss-${id}`,
    name,
    slug: vanity || id,
    styleseatUrl: profileUrl,
    city,
    state,
    categories,
    specialties: serviceNames.length > 0 ? serviceNames.slice(0, 8) : categories,
    bio: stringValue(salon.name) || null,
    services: serviceNames.map((service) => ({ name: service, price: null, duration: null })),
    reviewCount: numberValue(item.num_ratings),
    rating: item.average_rating != null ? numberValue(item.average_rating) : null,
    imageUrl: stringValue(item.profile_photo) || null,
    priceRange: null,
    isIndependent: true,
    harvestDate: new Date().toISOString().slice(0, 10),
    batchId: input.batchId ?? `styleseat-internal-${Date.now()}`,
    discoveryMode: input.discoveryMode ?? "direct_url",
    seedUrl: input.sourceUrl,
    sourceUrl: profileUrl,
    rawText,
    imageCount: [item.profile_photo, item.cover_photo].filter(Boolean).length,
    extractionSource: "internal_api",
    rawApiRecord: item,
  };
}

async function writeInternalApiDebug(input: {
  runId?: string;
  sourceUrl: string;
  parsedSearch: ParsedStyleSeatSearchUrl | null;
  result: StyleSeatInternalApiResult;
}): Promise<string | undefined> {
  const dir = getRunDebugDir(input.runId);
  if (!dir) return undefined;
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, "internal-api.json");
  await fs.writeFile(filePath, JSON.stringify({
    sourceUrl: input.sourceUrl,
    parsedSearch: input.parsedSearch,
    apiUrlsTried: input.result.apiUrlsTried,
    apiUrlsSucceeded: input.result.apiUrlsSucceeded,
    apiUrlsFailed: input.result.apiUrlsFailed,
    selectedApiPattern: input.result.diagnostics.selectedApiPattern,
    resultCount: input.result.records.length,
    sampleRecordKeys: Object.keys(input.result.records[0]?.rawApiRecord ?? {}).slice(0, 60),
    sampleMappedRecords: input.result.records.slice(0, 5).map((record) => ({
      displayName: record.name,
      profileUrl: record.styleseatUrl,
      city: record.city,
      state: record.state,
      categories: record.categories,
      specialties: record.specialties.slice(0, 8),
      extractionSource: record.extractionSource,
    })),
  }, null, 2), "utf8");
  return filePath;
}

export async function extractStyleSeatViaInternalApi(input: StyleSeatInternalApiInput): Promise<StyleSeatInternalApiResult> {
  const fetched = await fetchStyleSeatSearchApi(input);
  const parsedSearch = fetched.parsedSearch;
  const category = categoryFromInput(input, parsedSearch);
  const batchId = `styleseat-internal-${Date.now()}`;
  const records = fetched.data
    .slice(0, input.maxOperators ?? 25)
    .map((item, index) => mapStyleSeatApiResultToRawRecord({
      item,
      index,
      sourceUrl: input.sourceUrl,
      category,
      parsedSearch,
      discoveryMode: input.discoveryMode,
      batchId,
    }));
  const result: StyleSeatInternalApiResult = {
    records,
    apiUrlsTried: fetched.apiUrlsTried,
    apiUrlsSucceeded: fetched.apiUrlsSucceeded,
    apiUrlsFailed: fetched.apiUrlsFailed,
    diagnostics: {
      networkHintCount: fetched.networkHintCount,
      selectedApiPattern: fetched.selectedApiPattern,
      resultCount: records.length,
    },
  };
  if (input.debug) {
    result.diagnostics.debugArtifactPath = await writeInternalApiDebug({
      runId: input.runId,
      sourceUrl: input.sourceUrl,
      parsedSearch,
      result,
    });
  }
  return result;
}
