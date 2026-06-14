export type ParsedDateRange = {
  month?: number;
  year?: number;
  label: string;
  start: Date;
  end: Date;
};

const MONTH_NAMES: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

function monthRange(year: number, month: number): ParsedDateRange {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const label = start.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  return { month, year, label, start, end };
}

function yearRange(year: number): ParsedDateRange {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  return { year, label: String(year), start, end };
}

export function parseSalonDateRange(
  text: string,
  referenceDate: Date = new Date(),
): ParsedDateRange | undefined {
  const normalized = text.trim().toLowerCase();

  if (/\bthis year\b/.test(normalized)) {
    return yearRange(referenceDate.getUTCFullYear());
  }

  if (/\bthis month\b/.test(normalized)) {
    return monthRange(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 1);
  }

  if (/\blast month\b/.test(normalized)) {
    const ref = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() - 1, 1));
    return monthRange(ref.getUTCFullYear(), ref.getUTCMonth() + 1);
  }

  for (const [name, month] of Object.entries(MONTH_NAMES)) {
    const monthPattern = new RegExp(`\\b${name}\\b(?:\\s+(20\\d{2}))?`);
    const match = normalized.match(monthPattern);
    if (match) {
      const year = match[1] ? Number.parseInt(match[1], 10) : referenceDate.getUTCFullYear();
      return monthRange(year, month);
    }
  }

  const yearMatch = normalized.match(/\b(20\d{2})\b/);
  if (yearMatch && /\b(year|this year|in 20)/.test(normalized)) {
    return yearRange(Number.parseInt(yearMatch[1], 10));
  }

  return undefined;
}

export function dateInRange(isoDate: string | undefined, range: ParsedDateRange): boolean {
  if (!isoDate?.trim()) return false;
  const parsed = Date.parse(isoDate);
  if (Number.isNaN(parsed)) return false;
  const d = new Date(parsed);
  return d >= range.start && d <= range.end;
}
