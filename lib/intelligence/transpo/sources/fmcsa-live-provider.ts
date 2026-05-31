// lib/intelligence/transpo/sources/fmcsa-live-provider.ts
// Live, read-only FMCSA provider backed by the USDOT "Company Census File"
// Socrata dataset on data.transportation.gov (dataset id: az4n-8mr2).
//
// No API key is required for the initial public test. Socrata column names vary
// across dataset revisions, so the live query is ultra-safe ($limit + $q only,
// no $where/$order), state/city filtering happens locally on mapped fields, and
// any failure — network, non-2xx, bad JSON, timeout, or zero rows — degrades
// gracefully with a detailed message instead of throwing.

import type {
  TranspoSourceRunInput,
  TranspoSourceMode,
  TranspoCarrierSourceRecord,
} from "../types";

export type FmcsaLiveResult = {
  ok: boolean;
  sourceMode: TranspoSourceMode;
  records: TranspoCarrierSourceRecord[];
  message?: string;
};

const ENDPOINT = "https://data.transportation.gov/resource/az4n-8mr2.json";
const ENDPOINT_LABEL = "data.transportation.gov/resource/az4n-8mr2.json";
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const FETCH_TIMEOUT_MS = 9000;

// Logical field -> candidate Socrata column names (checked in order).
const FIELD_CANDIDATES = {
  companyName: ["legal_name", "legalname", "name", "carrier_name", "entity_name"],
  dbaName: ["dba_name", "dbaname"],
  dotNumber: ["usdot_number", "dot_number", "usdot", "dot"],
  mcNumber: ["mc_number", "docket_number", "docket", "mc_mx_ff_number", "docket1"],
  city: ["physical_city", "phy_city", "city", "mailing_city"],
  state: ["physical_state", "phy_state", "state", "mailing_state"],
  address: ["physical_street", "phy_street", "address", "mailing_street"],
  phone: ["telephone", "phone", "phone_number"],
  fleetSize: ["power_units", "nbr_power_unit", "powerunits", "truck_units"],
  driverCount: ["drivers", "total_drivers", "nbr_drivers", "driver_total"],
  authorityStatus: ["status", "authority_status", "operating_status", "entity_status", "status_code"],
} as const;

type SocrataRow = Record<string, unknown>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function clampLimit(limit?: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return DEFAULT_LIMIT;
  const rounded = Math.floor(limit);
  if (rounded < 1) return 1;
  if (rounded > MAX_LIMIT) return MAX_LIMIT;
  return rounded;
}

function toNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && value.trim() !== "" ? n : undefined;
}

/** First non-empty value among the candidate column names. */
export function pick(row: SocrataRow, candidates: readonly string[]): string | undefined {
  for (const c of candidates) {
    const v = row[c];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return undefined;
}

/** Maps an arbitrary Socrata row into our durable carrier record shape. */
export function normalizeSocrataRow(row: SocrataRow): TranspoCarrierSourceRecord {
  const companyName =
    pick(row, FIELD_CANDIDATES.companyName) ??
    pick(row, FIELD_CANDIDATES.dbaName) ??
    "(unnamed carrier)";
  const dotNumber = pick(row, FIELD_CANDIDATES.dotNumber);
  const mcNumber = pick(row, FIELD_CANDIDATES.mcNumber);
  const city = pick(row, FIELD_CANDIDATES.city);
  const state = pick(row, FIELD_CANDIDATES.state);
  const address = pick(row, FIELD_CANDIDATES.address);
  const phone = pick(row, FIELD_CANDIDATES.phone);
  const fleetSize = toNumber(pick(row, FIELD_CANDIDATES.fleetSize));
  const driverCount = toNumber(pick(row, FIELD_CANDIDATES.driverCount));
  const authorityStatus = pick(row, FIELD_CANDIDATES.authorityStatus);

  return {
    companyName,
    dotNumber,
    mcNumber,
    city,
    state,
    address,
    phone,
    fleetSize,
    driverCount,
    authorityStatus,
    sourceUrl: dotNumber
      ? `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&query_string=${dotNumber}`
      : ENDPOINT,
    rawSource: "FMCSA_COMPANY_CENSUS_LIVE",
  };
}

type BuildUrlInput = {
  limit: number;
  keyword?: string;
};

/**
 * Builds an ultra-safe Socrata request URL.
 *
 * Deliberately avoids $where / $order (which fail when Socrata column names
 * differ across dataset revisions). Only $select, $limit, and — when present —
 * $q free-text search are used. State/city filtering is applied locally after
 * the rows return, against the normalized mapped fields.
 */
export function buildSocrataUrl(input: BuildUrlInput): string {
  const params = new URLSearchParams();
  params.set("$select", "*");
  params.set("$limit", String(input.limit));

  if (input.keyword) {
    const firstTerm = input.keyword.split(",")[0]?.trim();
    if (firstTerm) params.set("$q", firstTerm);
  }

  return `${ENDPOINT}?${params.toString()}`;
}

/** Local, case-insensitive state/city filter on already-mapped records. */
function applyLocalFilters(
  records: TranspoCarrierSourceRecord[],
  state: string,
  city: string,
): TranspoCarrierSourceRecord[] {
  const s = state.trim().toLowerCase();
  const c = city.trim().toLowerCase();
  return records.filter((r) => {
    if (s && (r.state ?? "").toLowerCase() !== s) return false;
    if (c && (r.city ?? "").toLowerCase() !== c) return false;
    return true;
  });
}

type FetchResult =
  | { ok: true; rows: SocrataRow[] }
  | { ok: false; error: string };

async function fetchSocrata(url: string): Promise<FetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const json: unknown = await res.json().catch(() => null);
    if (!Array.isArray(json)) {
      return { ok: false, error: "unexpected response shape (expected JSON array)" };
    }
    return { ok: true, rows: json as SocrataRow[] };
  } catch (e) {
    const reason = e instanceof Error && e.name === "AbortError" ? "request timed out" : e instanceof Error ? e.message : String(e);
    return { ok: false, error: reason };
  } finally {
    clearTimeout(timer);
  }
}

function describeFilters(state: string, city: string, keyword: string): string {
  const parts: string[] = [];
  if (state) parts.push(`state=${state}`);
  if (city) parts.push(`city=${city}`);
  if (keyword) parts.push(`keyword=${keyword.split(",")[0]?.trim() ?? keyword}`);
  return parts.length ? parts.join(", ") : "none";
}

// ── Provider entry point ─────────────────────────────────────────────────────

export async function runFmcsaLivePull(
  input: TranspoSourceRunInput,
): Promise<FmcsaLiveResult> {
  const limit = clampLimit(input.limit);
  const state = (input.state ?? "").trim();
  const city = (input.city ?? "").trim();
  const keyword = (input.keyword ?? "").trim();
  const hasLocalFilters = Boolean(state || city);

  // Fetch a buffer larger than the requested limit so local state/city filtering
  // still has candidates to work with, capped at the dataset/UI ceiling.
  const bufferLimit = Math.min(Math.max(limit * 5, 25), MAX_LIMIT);
  const filterLabel = describeFilters(state, city, keyword);

  // (a) Primary ultra-safe query: $limit (+ $q for keyword). No $where/$order.
  const primary = await fetchSocrata(buildSocrataUrl({ limit: bufferLimit, keyword }));

  if (primary.ok) {
    const mapped = primary.rows.map(normalizeSocrataRow);

    if (hasLocalFilters) {
      const localMatches = applyLocalFilters(mapped, state, city);
      if (localMatches.length > 0) {
        const records = localMatches.slice(0, limit);
        return {
          ok: true,
          sourceMode: "live_api",
          records,
          message: `Live Company Census · endpoint=${ENDPOINT_LABEL} · filters=${filterLabel} · rows=${records.length}`,
        };
      }
      // No local matches → return the unfiltered live sample with a clear note.
      const sample = mapped.slice(0, limit);
      if (sample.length > 0) {
        return {
          ok: true,
          sourceMode: "live_api",
          records: sample,
          message: `No local matches after filtering; showing live Company Census sample. · endpoint=${ENDPOINT_LABEL} · attempted filters=${filterLabel} · rows=${sample.length}`,
        };
      }
      // Primary returned zero rows entirely → fall through to bare fallback.
    } else {
      const records = mapped.slice(0, limit);
      if (records.length > 0) {
        return {
          ok: true,
          sourceMode: "live_api",
          records,
          message: `Live Company Census · endpoint=${ENDPOINT_LABEL} · filters=${filterLabel} · rows=${records.length}`,
        };
      }
      // Zero rows → fall through to bare fallback.
    }
  }

  // (b) Fallback: bare $limit query — no $q, no filters.
  const fallback = await fetchSocrata(buildSocrataUrl({ limit: bufferLimit }));
  if (fallback.ok) {
    const records = fallback.rows.map(normalizeSocrataRow).slice(0, limit);
    if (records.length > 0) {
      const primaryNote = primary.ok ? "primary query returned 0 rows" : `primary query failed: ${primary.error}`;
      return {
        ok: true,
        sourceMode: "live_api",
        records,
        message: `Live provider fallback: returned unfiltered Company Census sample. (${primaryNote}) · endpoint=${ENDPOINT_LABEL} · rows=${records.length}`,
      };
    }
    return {
      ok: false,
      sourceMode: "live_api",
      records: [],
      message: `Live FMCSA provider returned no records. Fallback unfiltered sample also returned 0 rows. endpoint=${ENDPOINT_LABEL}`,
    };
  }

  // Both requests failed (network blocked / timeout / non-2xx / bad JSON).
  const reason = !primary.ok ? primary.error : fallback.error;
  return {
    ok: false,
    sourceMode: "live_api",
    records: [],
    message: `Live FMCSA provider request failed (${reason}). No records returned. endpoint=${ENDPOINT_LABEL}`,
  };
}
