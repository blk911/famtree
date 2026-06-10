import crypto from "crypto";
import type { ParseBookUploadResult, VmbBookRecord } from "@/types/vmb/provider-ingest";

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

function recordFromParts(parts: string[], lineIndex: number): VmbBookRecord | null {
  const trimmed = parts.map((p) => p.trim()).filter(Boolean);
  if (trimmed.length === 0) return null;

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
    if (normalizeDate(part) && !lastVisitDate && /\d{4}|\d{1,2}\/\d{1,2}/.test(part)) {
      lastVisitDate = normalizeDate(part);
      continue;
    }
    if (!serviceName) {
      serviceName = part;
    }
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

const CSV_HEADER_MAP: Record<string, keyof VmbBookRecord> = {
  clientname: "clientName",
  name: "clientName",
  client: "clientName",
  email: "email",
  phone: "phone",
  servicename: "serviceName",
  service: "serviceName",
  lastvisitdate: "lastVisitDate",
  lastvisit: "lastVisitDate",
  last_visit: "lastVisitDate",
  amountspent: "amountSpent",
  amount: "amountSpent",
  total: "amountSpent",
  visitcount: "visitCount",
  visits: "visitCount",
  providername: "providerName",
  provider: "providerName",
  notes: "notes",
};

function parseCsvRows(lines: string[], warnings: string[]): VmbBookRecord[] {
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ""));
  const hasKnownHeader = headers.some((h) => h in CSV_HEADER_MAP);
  if (!hasKnownHeader) return [];

  const records: VmbBookRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.every((c) => !c.trim())) continue;
    const partial: Partial<VmbBookRecord> = {};
    headers.forEach((header, idx) => {
      const field = CSV_HEADER_MAP[header];
      const val = cols[idx]?.trim();
      if (!field || !val) return;
      if (field === "amountSpent") partial.amountSpent = parseAmount(val);
      else if (field === "visitCount") partial.visitCount = parseVisitCount(val);
      else if (field === "lastVisitDate") partial.lastVisitDate = normalizeDate(val);
      else (partial as Record<string, string>)[field] = val;
    });
    if (!partial.clientName) {
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
  return records;
}

export function parseBookUpload(rawText: string): ParseBookUploadResult {
  const warnings: string[] = [];
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { records: [], warnings: ["No lines found in input"] };
  }

  let records: VmbBookRecord[] = [];

  const csvRecords = parseCsvRows(lines, warnings);
  if (csvRecords.length > 0) {
    records = csvRecords;
  } else {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      try {
        const parts = line.includes("|") ? line.split("|") : line.split(/\t+|,{1}(?=(?:[^"]*"[^"]*")*[^"]*$)/);
        const rec = recordFromParts(parts, i);
        if (rec) records.push(rec);
        else warnings.push(`Line ${i + 1}: could not parse — skipped`);
      } catch {
        warnings.push(`Line ${i + 1}: parse error — skipped`);
      }
    }
  }

  const seen = new Set<string>();
  records = records.filter((r) => {
    const key = `${r.clientName.toLowerCase()}|${r.email ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (records.length === 0 && lines.length > 0) {
    warnings.push("No client records parsed — check format (pipe, CSV headers, or one client per line)");
  }

  return { records, warnings };
}
