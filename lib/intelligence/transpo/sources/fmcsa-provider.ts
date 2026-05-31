// lib/intelligence/transpo/sources/fmcsa-provider.ts
// FMCSA provider abstraction. Resolves which provider implementation to use
// (mock | csv | live) from TRANSPO_FMCSA_PROVIDER (default "mock") and runs it.
//
// The mock provider lives here and reproduces the original deterministic test
// pull behavior. CSV and live providers are delegated to sibling modules.

import type {
  TranspoSourceRunInput,
  TranspoSourceMode,
  TranspoCarrierSourceRecord,
} from "../types";
import { runFmcsaCsvPull } from "./fmcsa-csv-provider";
import { runFmcsaLivePull } from "./fmcsa-live-provider";

export type FmcsaProviderKind = "mock" | "csv" | "live";

export type FmcsaProviderResult = {
  ok: boolean;
  providerKind: FmcsaProviderKind;
  sourceMode: TranspoSourceMode;
  records: TranspoCarrierSourceRecord[];
  message?: string;
};

/** Coerce a raw string into a valid provider kind, or null if unrecognized. */
function normalizeProviderKind(raw?: string | null): FmcsaProviderKind | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === "mock" || v === "csv" || v === "live") return v;
  return null;
}

/**
 * Resolve which FMCSA provider to use.
 * Priority: explicit override (e.g. request body) → TRANSPO_FMCSA_PROVIDER → "mock".
 */
export function resolveFmcsaProviderKind(override?: string | null): FmcsaProviderKind {
  return (
    normalizeProviderKind(override) ??
    normalizeProviderKind(process.env.TRANSPO_FMCSA_PROVIDER) ??
    "mock"
  );
}

// ── Mock provider (original deterministic test-pull behavior) ───────────────

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const COMPANY_STEMS = [
  "Summit Freight",
  "Frontier Logistics",
  "Mountain Pass Carriers",
  "Mile High Transport",
  "Prairie Line Haul",
  "Redrock Trucking",
  "Aspen Cargo",
  "Continental Drayage",
  "Cornerstone Freightways",
  "Vanguard Expedite",
  "Horizon Bulk Lines",
  "Granite State Logistics",
];

const COMPANY_SUFFIXES = ["LLC", "Inc", "Co", "Transport Group", "Express"];

const AUTHORITY_STATUSES = ["ACTIVE", "ACTIVE", "ACTIVE", "PENDING", "OUT_OF_SERVICE"];

const FALLBACK_CITIES = [
  "Denver",
  "Aurora",
  "Colorado Springs",
  "Pueblo",
  "Fort Collins",
  "Greeley",
];

function hashString(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function clampLimit(limit?: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return DEFAULT_LIMIT;
  const rounded = Math.floor(limit);
  if (rounded < 1) return 1;
  if (rounded > MAX_LIMIT) return MAX_LIMIT;
  return rounded;
}

function buildMockRecords(input: TranspoSourceRunInput): TranspoCarrierSourceRecord[] {
  const limit = clampLimit(input.limit);
  const state = (input.state ?? "").trim() || "CO";
  const requestedCity = (input.city ?? "").trim();
  const keyword = (input.keyword ?? "").trim();
  const market = (input.market ?? "").trim();

  const baseSeed = hashString(
    [market, state, requestedCity, keyword].join("|").toLowerCase(),
  );

  const records: TranspoCarrierSourceRecord[] = [];
  for (let i = 0; i < limit; i++) {
    const seed = hashString(`${baseSeed}:${i}`);
    const stem = pick(COMPANY_STEMS, seed);
    const suffix = pick(COMPANY_SUFFIXES, seed >> 3);
    const keywordTag = keyword ? ` ${keyword}` : "";
    const companyName = `${stem}${keywordTag} ${suffix}`.replace(/\s+/g, " ").trim();

    const city = requestedCity || pick(FALLBACK_CITIES, seed >> 5);
    const dotNumber = String(1_000_000 + (seed % 8_999_999));
    const mcNumber = String(100_000 + ((seed >> 7) % 899_999));
    const areaCode = 300 + ((seed >> 9) % 699);
    const exchange = 200 + ((seed >> 11) % 799);
    const lineNum = 1000 + ((seed >> 13) % 8999);
    const phone = `(${areaCode}) ${exchange}-${lineNum}`;
    const fleetSize = 5 + (seed % 240);
    const driverCount = Math.max(fleetSize, fleetSize + ((seed >> 4) % 60));
    const authorityStatus = pick(AUTHORITY_STATUSES, seed >> 6);

    records.push({
      companyName,
      dotNumber,
      mcNumber: `MC-${mcNumber}`,
      city,
      state,
      phone,
      fleetSize,
      driverCount,
      authorityStatus,
      sourceUrl: `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&query_string=${dotNumber}`,
      rawSource: "FMCSA_TEST",
    });
  }

  return records;
}

function runFmcsaMockPull(input: TranspoSourceRunInput): FmcsaProviderResult {
  return {
    ok: true,
    providerKind: "mock",
    sourceMode: "mock_fmcsa_test",
    records: buildMockRecords(input),
  };
}

// ── Orchestration ──────────────────────────────────────────────────────────

export async function runFmcsaProvider(
  input: TranspoSourceRunInput,
  override?: string | null,
): Promise<FmcsaProviderResult> {
  const kind = resolveFmcsaProviderKind(override);

  if (kind === "csv") {
    const res = await runFmcsaCsvPull(input);
    return { ...res, providerKind: "csv" };
  }

  if (kind === "live") {
    const res = await runFmcsaLivePull(input);
    return { ...res, providerKind: "live" };
  }

  return runFmcsaMockPull(input);
}
