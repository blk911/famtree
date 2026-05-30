// lib/intelligence/transpo/sources/fmcsa-csv-provider.ts
// CSV-backed FMCSA provider. Reads a local carrier CSV export and maps rows
// into TranspoCarrierSourceRecord. No external calls, no new dependencies.
//
// Expected file: runtime-data/intelligence/transpo/imports/fmcsa-carriers.csv
// Flexible headers are supported (see HEADER_ALIASES).

import { promises as fs } from "fs";
import path from "path";
import type {
  TranspoSourceRunInput,
  TranspoSourceMode,
  TranspoCarrierSourceRecord,
} from "../types";

export type FmcsaCsvResult = {
  ok: boolean;
  sourceMode: TranspoSourceMode;
  records: TranspoCarrierSourceRecord[];
  message?: string;
};

const CSV_FILE = path.join(
  process.cwd(),
  "runtime-data",
  "intelligence",
  "transpo",
  "imports",
  "fmcsa-carriers.csv",
);

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

// Logical field -> accepted header names (lowercased, non-alphanumeric stripped).
const HEADER_ALIASES: Record<string, string[]> = {
  companyName: ["companyname", "name", "legalname"],
  dotNumber: ["dotnumber", "dot", "usdot"],
  mcNumber: ["mcnumber", "mc"],
  city: ["city"],
  state: ["state"],
  phone: ["phone"],
  fleetSize: ["fleetsize", "powerunits"],
  driverCount: ["drivercount", "drivers"],
  authorityStatus: ["authoritystatus", "status"],
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function clampLimit(limit?: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return DEFAULT_LIMIT;
  const rounded = Math.floor(limit);
  if (rounded < 1) return 1;
  if (rounded > MAX_LIMIT) return MAX_LIMIT;
  return rounded;
}

// Minimal CSV parser supporting quoted fields, escaped quotes ("") and
// commas/newlines inside quotes. Returns an array of rows (arrays of cells).
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      // Handle CRLF: skip the \n following a \r
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  // Flush trailing field/row if present.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop fully-empty rows.
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function buildHeaderMap(headerRow: string[]): Record<string, number> {
  const normalized = headerRow.map(normalizeHeader);
  const map: Record<string, number> = {};
  for (const [logical, aliases] of Object.entries(HEADER_ALIASES)) {
    const idx = normalized.findIndex((h) => aliases.includes(h));
    if (idx >= 0) map[logical] = idx;
  }
  return map;
}

function cell(row: string[], idx: number | undefined): string {
  if (idx === undefined) return "";
  return (row[idx] ?? "").trim();
}

function toNumber(value: string): number | undefined {
  if (!value) return undefined;
  const n = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && value.trim() !== "" ? n : undefined;
}

export async function runFmcsaCsvPull(
  input: TranspoSourceRunInput,
): Promise<FmcsaCsvResult> {
  let raw: string;
  try {
    raw = await fs.readFile(CSV_FILE, "utf8");
  } catch {
    return {
      ok: false,
      sourceMode: "csv_import",
      records: [],
      message:
        "FMCSA CSV import file not found at runtime-data/intelligence/transpo/imports/fmcsa-carriers.csv",
    };
  }

  const rows = parseCsv(raw);
  if (rows.length < 2) {
    return {
      ok: false,
      sourceMode: "csv_import",
      records: [],
      message: "FMCSA CSV import is empty or missing a header row.",
    };
  }

  const headerMap = buildHeaderMap(rows[0]);
  if (headerMap.companyName === undefined) {
    return {
      ok: false,
      sourceMode: "csv_import",
      records: [],
      message:
        "FMCSA CSV import is missing a recognizable company name column (companyName/name/legalName).",
    };
  }

  const filterState = (input.state ?? "").trim().toLowerCase();
  const filterCity = (input.city ?? "").trim().toLowerCase();
  const filterKeyword = (input.keyword ?? "").trim().toLowerCase();
  const limit = clampLimit(input.limit);

  const records: TranspoCarrierSourceRecord[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const companyName = cell(row, headerMap.companyName);
    if (!companyName) continue;

    const state = cell(row, headerMap.state);
    const city = cell(row, headerMap.city);

    if (filterState && state.toLowerCase() !== filterState) continue;
    if (filterCity && city.toLowerCase() !== filterCity) continue;

    if (filterKeyword) {
      // Match keyword (possibly comma-separated) against company name.
      const terms = filterKeyword.split(",").map((t) => t.trim()).filter(Boolean);
      const haystack = companyName.toLowerCase();
      const hit = terms.length === 0 || terms.some((t) => haystack.includes(t));
      if (!hit) continue;
    }

    const record: TranspoCarrierSourceRecord = {
      companyName,
      dotNumber: cell(row, headerMap.dotNumber) || undefined,
      mcNumber: cell(row, headerMap.mcNumber) || undefined,
      city: city || undefined,
      state: state || undefined,
      phone: cell(row, headerMap.phone) || undefined,
      fleetSize: toNumber(cell(row, headerMap.fleetSize)),
      driverCount: toNumber(cell(row, headerMap.driverCount)),
      authorityStatus: cell(row, headerMap.authorityStatus) || undefined,
      rawSource: "FMCSA_CSV",
    };
    records.push(record);
    if (records.length >= limit) break;
  }

  return {
    ok: true,
    sourceMode: "csv_import",
    records,
    message:
      records.length === 0
        ? "FMCSA CSV import loaded, but no rows matched the given filters."
        : undefined,
  };
}
