// lib/studios/education-seeds/parse.ts
// Parses a textarea of educator identity strings into IdentitySeeds.
//
// Supported input formats (one per line):
//   @handle                        — IG handle only
//   https://instagram.com/handle   — IG URL
//   name, handle, city, state      — CSV
//   name | handle | city | state   — pipe-delimited
//   Jane Smith                     — name only (will generate candidates)
//   Jane Smith, Denver, CO         — name + location (CSV)
//
// Blank lines and lines starting with # are skipped.

import {
  inferEducationType,
  inferAudienceType,
} from "@/lib/studios/creator-lab/hashtag-harvest/education-config";
import type { EducationType, AudienceType } from "@/lib/studios/creator-lab/hashtag-harvest/education-config";
import type { IdentitySeed } from "@/lib/studios/identity-seeds/types";
import type { ParsedEducationSeed } from "./types";

// ─── Handle extraction ────────────────────────────────────────────────────────

const IG_URL_RE = /(?:instagram\.com|instagr\.am)\/([a-z0-9._]{1,30})/i;
const HANDLE_RE = /^@([a-z0-9._]{1,30})$/i;

function extractHandle(raw: string): string | null {
  const urlMatch = raw.match(IG_URL_RE);
  if (urlMatch) return urlMatch[1].toLowerCase();

  const handleMatch = raw.trim().match(HANDLE_RE);
  if (handleMatch) return handleMatch[1].toLowerCase();

  return null;
}

// ─── US state normalization ───────────────────────────────────────────────────

const STATE_ABBREVS: Record<string, string> = {
  colorado: "CO", texas: "TX", california: "CA", "new york": "NY",
  florida: "FL", illinois: "IL", georgia: "GA", ohio: "OH",
  michigan: "MI", arizona: "AZ", washington: "WA", oregon: "OR",
  massachusetts: "MA", tennessee: "TN", north_carolina: "NC",
  virginia: "VA", maryland: "MD", nevada: "NV", utah: "UT",
  minnesota: "MN", missouri: "MO", pennsylvania: "PA",
};

const TWO_LETTER_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
  "DC",
]);

function normalizeState(raw: string): string | null {
  const trimmed = raw.trim();
  if (TWO_LETTER_STATES.has(trimmed.toUpperCase())) return trimmed.toUpperCase();
  const lower = trimmed.toLowerCase().replace(/\s+/g, "_");
  return STATE_ABBREVS[lower] ?? null;
}

// ─── Line parser ──────────────────────────────────────────────────────────────

function parseLine(line: string): ParsedEducationSeed {
  const rawLine = line.trim();
  const warnings: string[] = [];

  // ── Handle-only: @handle
  const handleMatch = rawLine.match(HANDLE_RE);
  if (handleMatch) {
    const handle = handleMatch[1].toLowerCase();
    return {
      rawLine, format: "handle",
      name: null, handle, city: null, state: null,
      educationType: null, audienceType: null, category: null,
      warnings,
    };
  }

  // ── URL: https://instagram.com/handle
  const urlHandle = extractHandle(rawLine);
  if (urlHandle && rawLine.includes("http")) {
    return {
      rawLine, format: "url",
      name: null, handle: urlHandle, city: null, state: null,
      educationType: null, audienceType: null, category: null,
      warnings,
    };
  }

  // ── Pipe-delimited: name | handle | city | state [| educationType]
  if (rawLine.includes("|")) {
    const parts = rawLine.split("|").map((p) => p.trim());
    const name   = parts[0] || null;
    const raw1   = parts[1] ?? "";
    const handle = extractHandle(raw1) ?? (raw1.length > 0 ? raw1.toLowerCase().replace(/[^a-z0-9._]/g, "") : null);
    const city   = parts[2] || null;
    const rawState = parts[3] ?? "";
    const state  = rawState ? normalizeState(rawState) : null;
    const catRaw = parts[4] ?? "";
    const educationType = catRaw ? inferEducationType(catRaw) : null;
    const audienceType  = catRaw ? inferAudienceType(catRaw) : null;
    return {
      rawLine, format: "pipe",
      name, handle: handle || null, city, state,
      educationType, audienceType,
      category: catRaw || null,
      warnings,
    };
  }

  // ── CSV: name, handle-or-city, city-or-state, state [, educationType]
  if (rawLine.includes(",")) {
    const parts = rawLine.split(",").map((p) => p.trim());

    // Detect if second field is a handle/URL or a city
    const field1 = parts[1] ?? "";
    const isHandle = field1.startsWith("@") || field1.includes("instagram.com");

    let name: string | null = parts[0] || null;
    let handle: string | null = null;
    let city: string | null   = null;
    let state: string | null  = null;
    let catRaw = "";

    if (isHandle) {
      // name, @handle, city, state [, eduType]
      handle  = (extractHandle(field1) ?? field1.replace(/[^a-z0-9._]/g, "")) || null;
      city    = parts[2] || null;
      state   = parts[3] ? normalizeState(parts[3]) : null;
      catRaw  = parts[4] ?? "";
    } else {
      // name, city, state [, eduType]
      city    = field1 || null;
      state   = parts[2] ? normalizeState(parts[2]) : null;
      catRaw  = parts[3] ?? "";
    }

    const educationType = catRaw ? inferEducationType(catRaw) : null;
    const audienceType  = catRaw ? inferAudienceType(catRaw) : null;

    return {
      rawLine, format: "csv",
      name, handle, city, state,
      educationType, audienceType,
      category: catRaw || null,
      warnings,
    };
  }

  // ── Name only (or single token)
  return {
    rawLine, format: "name_only",
    name: rawLine, handle: null, city: null, state: null,
    educationType: null, audienceType: null, category: null,
    warnings: rawLine.length < 3 ? ["Very short — may not produce useful candidates"] : [],
  };
}

// ─── Textarea → ParsedEducationSeed[] ────────────────────────────────────────

export function parseEducationSeedText(text: string): ParsedEducationSeed[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map(parseLine);
}

// ─── ParsedEducationSeed → IdentitySeed ──────────────────────────────────────

export function parsedSeedToIdentitySeed(
  parsed: ParsedEducationSeed,
  opts: {
    batchId: string;
    runId: string;
    seedDate: string;
    defaultEducationType?: EducationType | null;
    defaultAudienceType?: AudienceType | null;
  }
): IdentitySeed {
  const name = parsed.name ?? parsed.handle ?? "unknown";

  return {
    name,
    handle: parsed.handle,
    city:   parsed.city,
    state:  parsed.state,
    vertical:       "education",
    category:       parsed.category,
    subcategory:    null,
    sourcePlatform: "instagram",
    sourceTool:     "education_seed_import",
    seedDate:       opts.seedDate,
    batchId:        opts.batchId,
    runId:          opts.runId,
    sourceHashtag:  parsed.category,
    sourceHashtags: parsed.category ? [parsed.category] : [],
    educationType:  parsed.educationType ?? opts.defaultEducationType ?? null,
    audienceType:   parsed.audienceType  ?? opts.defaultAudienceType  ?? null,
    sourceTopic:    parsed.category,
    knownUrls:      [],
    bio:            null,
    extraEvidence:  [],
    services:       [],
  };
}
