// lib/intelligence/salon/backoffice/file-parser.ts
// Safe CSV parsing for owner-uploaded exports. XLSX only when dependency exists.

export type ParsedSalonFile = {
  headers: string[];
  rows: Record<string, string>[];
};

export type ParseSalonFileResult =
  | { ok: true; data: ParsedSalonFile }
  | { ok: false; error: string };

const MAX_ROWS = 10_000;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

function isXlsx(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xls");
}

function isCsv(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".csv") || lower.endsWith(".txt");
}

/** Parse a single CSV line respecting quoted fields. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function parseCsvText(text: string): ParsedSalonFile {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length && rows.length < MAX_ROWS; i++) {
    const cells = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    let hasValue = false;
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c] || `column_${c}`;
      const val = (cells[c] ?? "").trim();
      if (val) hasValue = true;
      row[key] = val;
    }
    if (hasValue) rows.push(row);
  }
  return { headers, rows };
}

export async function parseSalonBackOfficeFile(
  buffer: Buffer,
  fileName: string,
): Promise<ParseSalonFileResult> {
  if (buffer.length > MAX_FILE_BYTES) {
    return { ok: false, error: "File exceeds 8MB limit." };
  }

  if (isXlsx(fileName)) {
    return {
      ok: false,
      error: "XLSX parsing not available yet; upload CSV.",
    };
  }

  if (!isCsv(fileName)) {
    return { ok: false, error: "Unsupported file type. Upload a .csv export." };
  }

  try {
    const text = buffer.toString("utf8");
    const data = parseCsvText(text);
    if (data.headers.length === 0) {
      return { ok: false, error: "CSV has no header row." };
    }
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to parse CSV.",
    };
  }
}
