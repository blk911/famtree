// lib/intelligence/transpo/sources/fmcsa-live-provider.ts
// Live, read-only FMCSA provider backed by the USDOT "Company Census File"
// Socrata dataset on data.transportation.gov (dataset id: az4n-8mr2).
//
// No API key is required for the public test. The primary query filters
// server-side ($where on phy_state/phy_city, $q for keyword, $order by
// dot_number) so state/city pulls return real, complete results from the full
// dataset. If that query fails (column rejected, network) or returns 0 rows, it
// degrades to an ultra-safe $limit sample with local filtering. Any failure —
// network, non-2xx, bad JSON, timeout, or zero rows — returns a detailed
// message instead of throwing.

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

// Confirmed columns on dataset az4n-8mr2 (verified live).
const STATE_FILTER_COLUMN = "phy_state";
const CITY_FILTER_COLUMN = "phy_city";
const ORDER_COLUMN = "dot_number";

/** Escapes a value for safe inclusion inside a SoQL single-quoted literal. */
function escapeSoql(value: string): string {
  return value.replace(/'/g, "''");
}

type BuildUrlInput = {
  limit: number;
  state?: string;
  city?: string;
  keyword?: string;
  /** When true, apply precise server-side $where/$order filtering across the
   *  full dataset. When false, a bare $limit (+ $q) sample query for fallback. */
  useWhere: boolean;
};

/**
 * Builds the Socrata request URL.
 *
 * Primary mode (useWhere=true): precise server-side filtering — $where on
 * state/city, $q for keyword, $order by dot_number. Columns are confirmed for
 * dataset az4n-8mr2; if a future revision rejects them the caller falls back to
 * the ultra-safe sample (useWhere=false) + local filtering.
 */
export function buildSocrataUrl(input: BuildUrlInput): string {
  const params = new URLSearchParams();
  params.set("$select", "*");
  params.set("$limit", String(input.limit));

  if (input.keyword) {
    const firstTerm = input.keyword.split(",")[0]?.trim();
    if (firstTerm) params.set("$q", firstTerm);
  }

  if (input.useWhere) {
    const clauses: string[] = [];
    if (input.state) {
      clauses.push(`upper(${STATE_FILTER_COLUMN})=upper('${escapeSoql(input.state)}')`);
    }
    if (input.city) {
      clauses.push(`upper(${CITY_FILTER_COLUMN})=upper('${escapeSoql(input.city)}')`);
    }
    if (clauses.length > 0) params.set("$where", clauses.join(" AND "));
    params.set("$order", `${ORDER_COLUMN} ASC`);
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
  const hasFilters = Boolean(state || city);
  const filterLabel = describeFilters(state, city, keyword);

  // (a) Primary: precise server-side filtering across the FULL dataset.
  // This is what makes state/city pulls return real, complete results instead
  // of whatever happened to land in a small sample window.
  const primary = await fetchSocrata(
    buildSocrataUrl({ limit, state, city, keyword, useWhere: true }),
  );
  if (primary.ok && primary.rows.length > 0) {
    const records = primary.rows.map(normalizeSocrataRow).slice(0, limit);
    return {
      ok: true,
      sourceMode: "live_api",
      records,
      message: `Live Company Census (server-side filter) · endpoint=${ENDPOINT_LABEL} · filters=${filterLabel} · rows=${records.length}`,
    };
  }

  // (b) Fallback: ultra-safe sample query + local filtering. Reached only if the
  // server-side filter failed (column rejected / network) or returned 0 rows.
  const bufferLimit = Math.min(Math.max(limit * 5, 25), MAX_LIMIT);
  const primaryNote = primary.ok
    ? "server-side filter returned 0 rows"
    : `server-side filter failed: ${primary.error}`;
  const fallback = await fetchSocrata(buildSocrataUrl({ limit: bufferLimit, useWhere: false }));

  if (fallback.ok) {
    const mapped = fallback.rows.map(normalizeSocrataRow);

    if (hasFilters) {
      const local = applyLocalFilters(mapped, state, city);
      if (local.length > 0) {
        const records = local.slice(0, limit);
        return {
          ok: true,
          sourceMode: "live_api",
          records,
          message: `Live Company Census (local-filter fallback; ${primaryNote}) · filters=${filterLabel} · rows=${records.length}`,
        };
      }
      const sample = mapped.slice(0, limit);
      if (sample.length > 0) {
        return {
          ok: true,
          sourceMode: "live_api",
          records: sample,
          message: `No matches after filtering; showing live Company Census sample. (${primaryNote}) · attempted filters=${filterLabel} · rows=${sample.length}`,
        };
      }
    } else {
      const records = mapped.slice(0, limit);
      if (records.length > 0) {
        return {
          ok: true,
          sourceMode: "live_api",
          records,
          message: `Live Company Census sample · endpoint=${ENDPOINT_LABEL} · rows=${records.length}`,
        };
      }
    }

    return {
      ok: false,
      sourceMode: "live_api",
      records: [],
      message: `Live FMCSA provider returned no records. (${primaryNote}; fallback sample empty) endpoint=${ENDPOINT_LABEL}`,
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
