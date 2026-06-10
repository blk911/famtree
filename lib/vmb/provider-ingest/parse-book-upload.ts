import crypto from "crypto";
import type { ParseBookUploadInput, ParseBookUploadResult, VmbBookRecord } from "@/types/vmb/provider-ingest";
import type { VmbProviderPlatform } from "@/types/vmb/trial";

function stableId(seed: string): string {
  return `book-${crypto.createHash("sha1").update(seed).digest("hex").slice(0, 10)}`;
}

function parseAmount(raw: string): number | undefined {
  const cleaned = raw.replace(/[$,\s]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

function parseVisitCount(raw: string): number | undefined {
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeDate(raw: string): string | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const parsed = Date.parse(t);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  return t;
}

/** Normalize header for lookup: lowercase, strip spaces/slashes/punctuation. */
function normalizeHeaderKey(header: string): string {
  return header
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[/\\]/g, " ")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

/** GlossGenius + generic CSV column aliases → VmbBookRecord field. */
const HEADER_ALIASES: Record<string, keyof VmbBookRecord> = {
  // Client name
  clientname: "clientName",
  customername: "clientName",
  customer: "clientName",
  name: "clientName",
  client: "clientName",
  fullname: "clientName",
  // Contact
  email: "email",
  emailaddress: "email",
  phone: "phone",
  phonenumber: "phone",
  mobile: "phone",
  cell: "phone",
  // Visits / dates
  lastvisitdate: "lastVisitDate",
  lastvisit: "lastVisitDate",
  lastappointment: "lastVisitDate",
  lastappointmentdate: "lastVisitDate",
  lastappt: "lastVisitDate",
  lastservice: "lastVisitDate",
  lastservicedate: "lastVisitDate",
  date: "lastVisitDate",
  appointmentdate: "lastVisitDate",
  // Services
  servicename: "serviceName",
  service: "serviceName",
  services: "serviceName",
  lastserviceprovided: "serviceName",
  // Spend
  amountspent: "amountSpent",
  totalspent: "amountSpent",
  totalspend: "amountSpent",
  lifetimevalue: "amountSpent",
  amount: "amountSpent",
  price: "amountSpent",
  total: "amountSpent",
  revenue: "amountSpent",
  // Visits count
  visitcount: "visitCount",
  visits: "visitCount",
  appointments: "visitCount",
  appointmentcount: "visitCount",
  totalappointments: "visitCount",
  numberofvisits: "visitCount",
  // Other
  providername: "providerName",
  provider: "providerName",
  stylist: "providerName",
  notes: "notes",
};

const GLOSSGENIUS_PRIORITY_HEADERS = [
  "clientname",
  "customername",
  "lastappointment",
  "lastvisit",
  "totalspent",
  "servicename",
  "visitcount",
];

function mapHeaderToField(header: string, providerPlatform?: VmbProviderPlatform): keyof VmbBookRecord | undefined {
  const key = normalizeHeaderKey(header);
  if (HEADER_ALIASES[key]) return HEADER_ALIASES[key];
  if (providerPlatform === "glossgenius") {
    if (key.includes("client") && key.includes("name")) return "clientName";
    if (key.includes("last") && (key.includes("visit") || key.includes("appt"))) return "lastVisitDate";
    if (key.includes("total") && key.includes("spent")) return "amountSpent";
    if (key.includes("service")) return "serviceName";
    if (key.includes("visit") || key.includes("appointment")) {
      if (key.includes("count") || key.includes("total") || key.includes("number")) return "visitCount";
    }
  }
  return undefined;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

function recordFromParts(parts: string[], lineIndex: number): VmbBookRecord | null {
  const trimmed = parts.map((p) => p.trim().replace(/^"|"$/g, ""));
  if (trimmed.every((p) => !p)) return null;

  const clientName = trimmed[0];
  if (!clientName) return null;

  let email: string | undefined;
  let phone: string | undefined;
  let serviceName: string | undefined;
  let lastVisitDate: string | undefined;
  let amountSpent: number | undefined;
  let visitCount: number | undefined;

  for (let i = 1; i < trimmed.length; i++) {
    const part = trimmed[i];
    if (!part) continue;
    if (part.includes("@") && !email) {
      email = part.replace(/^mailto:/i, "");
      continue;
    }
    if (/^\+?[\d\s().-]{7,}$/.test(part) && !phone) {
      phone = part;
      continue;
    }
    if (parseAmount(part) !== undefined && amountSpent === undefined && /[\d.$]/.test(part)) {
      amountSpent = parseAmount(part);
      continue;
    }
    if (parseVisitCount(part) !== undefined && visitCount === undefined && /^\d+$/.test(part)) {
      visitCount = parseVisitCount(part);
      continue;
    }
    if (normalizeDate(part) && !lastVisitDate && /\d{4}|\d{1,2}[/-]\d{1,2}/.test(part)) {
      lastVisitDate = normalizeDate(part);
      continue;
    }
    if (!serviceName) serviceName = part;
  }

  return {
    id: stableId(`${clientName}|${email ?? ""}|${lineIndex}`),
    clientName,
    email,
    phone,
    serviceName,
    lastVisitDate,
    amountSpent,
    visitCount,
  };
}

type CsvParseOutcome = {
  records: VmbBookRecord[];
  warnings: string[];
  skippedRows: number;
  detectedColumns: string[];
};

function parseCsvRows(
  lines: string[],
  providerPlatform?: VmbProviderPlatform,
): CsvParseOutcome {
  const warnings: string[] = [];
  const detectedColumns: string[] = [];
  let skippedRows = 0;

  if (lines.length < 2) {
    return { records: [], warnings: ["CSV needs a header row and at least one data row"], skippedRows: 0, detectedColumns };
  }

  const rawHeaders = parseCsvLine(lines[0]);
  detectedColumns.push(...rawHeaders.map((h) => h.trim()).filter(Boolean));

  const fieldByCol = rawHeaders.map((h) => mapHeaderToField(h, providerPlatform));
  const hasClientCol = fieldByCol.some((f) => f === "clientName");

  if (!hasClientCol) {
    if (providerPlatform === "glossgenius") {
      warnings.push(
        "GlossGenius export: no Client Name column detected — trying first column as client name",
      );
      fieldByCol[0] = "clientName";
    } else {
      return {
        records: [],
        warnings: ["No recognizable client name column in CSV header"],
        skippedRows: 0,
        detectedColumns,
      };
    }
  }

  const records: VmbBookRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.every((c) => !c.trim())) {
      skippedRows++;
      continue;
    }

    const partial: Partial<VmbBookRecord> = {};
    fieldByCol.forEach((field, idx) => {
      if (!field) return;
      const val = cols[idx]?.trim().replace(/^"|"$/g, "");
      if (!val) return;
      if (field === "amountSpent") partial.amountSpent = parseAmount(val);
      else if (field === "visitCount") partial.visitCount = parseVisitCount(val);
      else if (field === "lastVisitDate") partial.lastVisitDate = normalizeDate(val);
      else (partial as Record<string, string>)[field] = val;
    });

    if (!partial.clientName) {
      skippedRows++;
      warnings.push(`Row ${i + 1}: missing client name — skipped`);
      continue;
    }

    records.push({
      id: stableId(`${partial.clientName}|${partial.email ?? ""}|csv-${i}`),
      clientName: partial.clientName,
      email: partial.email,
      phone: partial.phone,
      serviceName: partial.serviceName,
      providerName: partial.providerName,
      lastVisitDate: partial.lastVisitDate,
      amountSpent: partial.amountSpent,
      visitCount: partial.visitCount,
      notes: partial.notes,
    });
  }

  if (providerPlatform === "glossgenius") {
    const normalized = detectedColumns.map((h) => normalizeHeaderKey(h));
    const matched = GLOSSGENIUS_PRIORITY_HEADERS.filter((h) => normalized.includes(h));
    if (matched.length < 2) {
      warnings.push(
        `GlossGenius mode: limited column match (${matched.length} core columns). Parsed ${records.length} rows.`,
      );
    }
  }

  return { records, warnings, skippedRows, detectedColumns };
}

export function parseBookUpload(input: ParseBookUploadInput | string): ParseBookUploadResult {
  const rawText = typeof input === "string" ? input : input.rawText;
  const providerPlatform = typeof input === "string" ? undefined : input.providerPlatform;

  const warnings: string[] = [];
  const lines = rawText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      records: [],
      warnings: ["No lines found in input"],
      skippedRows: 0,
      detectedColumns: [],
      parsedRecordCount: 0,
      providerMode: providerPlatform ?? "generic",
    };
  }

  let records: VmbBookRecord[] = [];
  let skippedRows = 0;
  let detectedColumns: string[] = [];

  const csvOutcome = parseCsvRows(lines, providerPlatform);
  if (csvOutcome.records.length > 0) {
    records = csvOutcome.records;
    warnings.push(...csvOutcome.warnings);
    skippedRows = csvOutcome.skippedRows;
    detectedColumns = csvOutcome.detectedColumns;
  } else {
    warnings.push(...csvOutcome.warnings);
    detectedColumns = csvOutcome.detectedColumns;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      try {
        const parts = line.includes("|")
          ? line.split("|")
          : line.split(/\t+|,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
        const rec = recordFromParts(parts, i);
        if (rec) records.push(rec);
        else {
          skippedRows++;
          warnings.push(`Line ${i + 1}: could not parse — skipped`);
        }
      } catch {
        skippedRows++;
        warnings.push(`Line ${i + 1}: parse error — skipped`);
      }
    }
  }

  const seen = new Set<string>();
  const deduped: VmbBookRecord[] = [];
  for (const r of records) {
    const key = `${r.clientName.toLowerCase()}|${r.email ?? ""}`;
    if (seen.has(key)) {
      skippedRows++;
      warnings.push(`Duplicate skipped: ${r.clientName}`);
      continue;
    }
    seen.add(key);
    deduped.push(r);
  }
  records = deduped;

  if (records.length === 0 && lines.length > 0) {
    warnings.push("No client records parsed — check CSV headers or pipe-separated format");
  }

  return {
    records,
    warnings,
    skippedRows,
    detectedColumns,
    parsedRecordCount: records.length,
    providerMode: providerPlatform ?? (detectedColumns.length > 0 ? "generic" : undefined),
  };
}

/** Read upload bytes as UTF-8 text (CSV). Rejects binary XLSX without parser dependency. */
export function decodeBookUploadFile(
  buffer: Buffer,
  fileName: string,
): { text: string } | { error: string } {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return {
      error:
        "XLSX uploads are not supported yet — export as CSV from your booking platform or paste the data.",
    };
  }
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  if (!text.trim()) {
    return { error: "Uploaded file is empty" };
  }
  return { text };
}
