// lib/intelligence/transpo/sources/fmcsa-live-provider.ts
// Live, read-only FMCSA provider backed by the USDOT "Company Census File"
// Socrata dataset on data.transportation.gov (dataset id: az4n-8mr2).
//
// No API key is required for the initial public test. Socrata column names vary
// across dataset revisions, so all field access is defensive (pick() over a list
// of candidate column names) and any failure — network, non-2xx, bad JSON, or a
// rejected $where filter — degrades gracefully instead of throwing.

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

// Primary column guesses used to build a server-side $where. If these columns
// do not exist on the dataset revision, Socrata returns 400 and we fall back to
// an unfiltered sample.
const STATE_FILTER_COLUMN = "phy_state";
const CITY_FILTER_COLUMN = "phy_city";
const ORDER_COLUMN = "dot_number";

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

/** Escapes a value for safe inclusion inside a SoQL single-quoted literal. */
function escapeSoql(value: string): string {
  return value.replace(/'/g, "''");
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
  state?: string;
  city?: string;
  keyword?: string;
  filtered: boolean;
};

/** Builds the Socrata request URL. When filtered is false, only $limit/$select
 *  are applied (the safe unfiltered fallback). */
export function buildSocrataUrl(input: BuildUrlInput): string {
  const params = new URLSearchParams();
  params.set("$select", "*");
  params.set("$limit", String(input.limit));

  if (input.filtered) {
    const clauses: string[] = [];
    if (input.state) {
      clauses.push(`upper(${STATE_FILTER_COLUMN})=upper('${escapeSoql(input.state)}')`);
    }
    if (input.city) {
      clauses.push(`upper(${CITY_FILTER_COLUMN})=upper('${escapeSoql(input.city)}')`);
    }
    if (clauses.length > 0) params.set("$where", clauses.join(" AND "));
    // Free-text search spans legal_name / dba_name / carrier_operation / etc.
    if (input.keyword) {
      const firstTerm = input.keyword.split(",")[0]?.trim();
      if (firstTerm) params.set("$q", firstTerm);
    }
    // Deterministic ordering on the canonical DOT column (confirmed present on
    // this dataset). Applied only to the filtered request; if rejected, the
    // unfiltered fallback below omits $order entirely for maximum safety.
    params.set("$order", `${ORDER_COLUMN} ASC`);
  }

  return `${ENDPOINT}?${params.toString()}`;
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

function mapRows(rows: SocrataRow[], limit: number): TranspoCarrierSourceRecord[] {
  return rows.slice(0, limit).map(normalizeSocrataRow);
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
  const hasFilters = Boolean(state || city || keyword);

  // No filters → straight unfiltered sample.
  if (!hasFilters) {
    const res = await fetchSocrata(buildSocrataUrl({ limit, filtered: false }));
    if (!res.ok) {
      return {
        ok: false,
        sourceMode: "live_api",
        records: [],
        message: `Live FMCSA Company Census request failed (${res.error}). endpoint=${ENDPOINT_LABEL}`,
      };
    }
    const records = mapRows(res.rows, limit);
    return {
      ok: records.length > 0,
      sourceMode: "live_api",
      records,
      message: `Live Company Census · endpoint=${ENDPOINT_LABEL} · filters=none · rows=${records.length}`,
    };
  }

  // Filtered attempt first.
  const filtered = await fetchSocrata(buildSocrataUrl({ limit, state, city, keyword, filtered: true }));
  if (filtered.ok) {
    const records = mapRows(filtered.rows, limit);
    return {
      ok: true,
      sourceMode: "live_api",
      records,
      message: `Live Company Census · endpoint=${ENDPOINT_LABEL} · filters=${describeFilters(state, city, keyword)} · rows=${records.length}`,
    };
  }

  // Filter columns rejected (or request failed) → safe unfiltered fallback.
  const fallback = await fetchSocrata(buildSocrataUrl({ limit, filtered: false }));
  if (!fallback.ok) {
    return {
      ok: false,
      sourceMode: "live_api",
      records: [],
      message: `Live FMCSA Company Census request failed (filtered: ${filtered.error}; fallback: ${fallback.error}). endpoint=${ENDPOINT_LABEL}`,
    };
  }

  const records = mapRows(fallback.rows, limit);
  return {
    ok: records.length > 0,
    sourceMode: "live_api",
    records,
    message: `Live provider fallback: returned unfiltered Company Census sample. (filtered query rejected: ${filtered.error}) · endpoint=${ENDPOINT_LABEL} · attempted filters=${describeFilters(state, city, keyword)} · rows=${records.length}`,
  };
}
