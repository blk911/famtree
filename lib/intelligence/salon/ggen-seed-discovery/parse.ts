// lib/intelligence/salon/ggen-seed-discovery/parse.ts

import type { GgenSeedInput } from "./types";

/** Normalize for matching / slug hints (letters+numbers only, lowercase). */
export function normalizeBusinessName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactSlug(raw: string): string {
  return normalizeBusinessName(raw).replace(/\s+/g, "");
}

function parseCsvLine(line: string): Partial<GgenSeedInput> {
  const parts = line.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return {};
  const out: Partial<GgenSeedInput> = { businessName: parts[0] };
  if (parts.length >= 2) out.category = parts[1];
  if (parts.length >= 3) out.city = parts[2];
  if (parts.length >= 4) out.state = parts[3];
  return out;
}

function parsePipeLine(line: string): Partial<GgenSeedInput> {
  const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return {};
  const out: Partial<GgenSeedInput> = { businessName: parts[0] };
  if (parts.length >= 2) out.category = parts[1];
  if (parts.length >= 3) out.city = parts[2];
  if (parts.length >= 4) out.state = parts[3];
  return out;
}

/**
 * Parse pasted text or file content — one business per line.
 * Supports: plain name, CSV, pipe-delimited, # comments.
 */
export function parseGgenSeedText(
  text: string,
  defaults?: { category?: string; city?: string; state?: string },
): GgenSeedInput[] {
  const lines = text.split(/\r?\n/);
  const out: GgenSeedInput[] = [];
  let lineNumber = 0;

  for (const rawLine of lines) {
    lineNumber++;
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    let partial: Partial<GgenSeedInput>;
    if (line.includes("|")) {
      partial = parsePipeLine(line);
    } else if (line.includes(",") && !line.includes("http")) {
      partial = parseCsvLine(line);
    } else {
      partial = { businessName: line };
    }

    const businessName = (partial.businessName ?? "").trim();
    if (businessName.length < 2) continue;

    out.push({
      businessName,
      category: partial.category ?? defaults?.category ?? null,
      city: partial.city ?? defaults?.city ?? null,
      state: partial.state ?? defaults?.state ?? null,
      lineNumber,
    });
  }

  return out;
}

export function businessNameToHandleHint(businessName: string): string {
  const compact = compactSlug(businessName);
  return compact.length >= 3 ? compact.slice(0, 40) : "salon";
}
