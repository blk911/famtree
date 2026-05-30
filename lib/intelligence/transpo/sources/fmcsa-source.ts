// lib/intelligence/transpo/sources/fmcsa-source.ts
// Transpo FMCSA / FM source adapter.
//
// runFmcsaTestPull() returns sample carrier/company records for a test pull.
// When no live FMCSA API key / data endpoint is configured, it falls back to a
// deterministic mock adapter (sourceMode "mock_fmcsa_test") so the source-ingest
// UI has realistic data to render without a live integration.

export type FmcsaPullInput = {
  market?: string;
  state?: string;
  city?: string;
  keyword?: string;
  limit?: number;
  notes?: string;
};

export type FmcsaCarrierRecord = {
  companyName: string;
  dotNumber: string;
  mcNumber: string;
  city: string;
  state: string;
  phone: string;
  fleetSize: number;
  driverCount: number;
  authorityStatus: string;
  sourceUrl: string;
  rawSource: "FMCSA_TEST";
};

export type FmcsaPullResult = {
  sourceMode: "mock_fmcsa_test";
  records: FmcsaCarrierRecord[];
};

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

// Deterministic seeds so the same input produces a stable set of records.
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

// Small deterministic string hash (FNV-1a style) for stable pseudo-randomness.
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

function buildMockRecords(input: FmcsaPullInput): FmcsaCarrierRecord[] {
  const limit = clampLimit(input.limit);
  const state = (input.state ?? "").trim() || "CO";
  const requestedCity = (input.city ?? "").trim();
  const keyword = (input.keyword ?? "").trim();
  const market = (input.market ?? "").trim();

  // Seed off the request so identical inputs yield identical records.
  const baseSeed = hashString(
    [market, state, requestedCity, keyword].join("|").toLowerCase(),
  );

  const records: FmcsaCarrierRecord[] = [];
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

/**
 * Run a test FMCSA / FM data pull.
 *
 * Currently always uses the deterministic mock adapter because no live FMCSA
 * API key / data endpoint is configured. The returned sourceMode flags this
 * clearly so callers and the UI can surface a "not live yet" warning.
 */
export async function runFmcsaTestPull(
  input: FmcsaPullInput,
): Promise<FmcsaPullResult> {
  // When a live FMCSA integration is added, branch here on the presence of an
  // API key / endpoint and return real records with a different sourceMode.
  const records = buildMockRecords(input);
  return {
    sourceMode: "mock_fmcsa_test",
    records,
  };
}
