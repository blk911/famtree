// lib/studios/education-directory/parse.ts
// Parses pasted directory rows, URLs, and text blocks into ParsedDirectoryEntry[].
//
// Supports:
//   Name | City ST | Category | https://site.com | @ighandle    — pipe
//   Name, City, ST, Category, URL                               — CSV
//   Name - City ST - Category                                   — dash
//   @handle                                                     — IG handle only
//   https://example.com or https://instagram.com/handle         — URL only
//   BrightPath Microschool | Castle Rock CO | microschool       — pipe (3-field)
//   Freeform text block describing an educator                  — text_block
//
// Blank lines and lines starting with # are skipped.

import {
  inferEducationType,
  inferAudienceType,
} from "@/lib/studios/creator-lab/hashtag-harvest/education-config";
import type { EducationType, AudienceType } from "@/lib/studios/creator-lab/hashtag-harvest/education-config";
import type { IdentitySeed } from "@/lib/studios/identity-seeds/types";
import type { MatchedUrl } from "@/lib/studios/prospects/types";
import type { ParsedDirectoryEntry } from "./types";

// ─── URL extraction ───────────────────────────────────────────────────────────

const IG_URL_RE   = /(?:instagram\.com|instagr\.am)\/([a-z0-9._]{1,30})/i;
const HANDLE_RE   = /^@([a-z0-9._]{1,30})$/i;
const HANDLE_ANY  = /@([a-z0-9._]{3,30})/i;
const URL_RE      = /https?:\/\/[^\s,|]+/gi;

function extractIgHandle(raw: string): string | null {
  const urlMatch = raw.match(IG_URL_RE);
  if (urlMatch) return urlMatch[1].toLowerCase();
  const handleMatch = raw.trim().match(HANDLE_RE);
  if (handleMatch) return handleMatch[1].toLowerCase();
  const anyHandle = raw.match(HANDLE_ANY);
  if (anyHandle) return anyHandle[1].toLowerCase();
  return null;
}

function extractAllUrls(text: string): string[] {
  return (text.match(URL_RE) ?? []).map((u) => u.replace(/[,|]+$/, "").trim());
}

function splitIgAndWeb(urls: string[]): { ig: string | null; web: string | null } {
  const igUrl  = urls.find((u) => /instagram\.com|instagr\.am/i.test(u)) ?? null;
  const webUrl = urls.find((u) => !/instagram\.com|instagr\.am/i.test(u)) ?? null;
  return { ig: igUrl, web: webUrl };
}

// ─── Location extraction ──────────────────────────────────────────────────────

const TWO_LETTER_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
]);

const STATE_NAMES: Record<string, string> = {
  colorado: "CO", texas: "TX", california: "CA", "new york": "NY",
  florida: "FL", illinois: "IL", georgia: "GA", ohio: "OH",
  michigan: "MI", arizona: "AZ", washington: "WA", oregon: "OR",
  massachusetts: "MA", tennessee: "TN", "north carolina": "NC",
  virginia: "VA", maryland: "MD", nevada: "NV", utah: "UT",
  minnesota: "MN", missouri: "MO", pennsylvania: "PA",
  wisconsin: "WI", indiana: "IN", kentucky: "KY", louisiana: "LA",
};

interface Location { city: string | null; state: string | null }

/**
 * Tries to extract City + State from a location string like:
 *   "Castle Rock, CO"  "Denver CO"  "Austin Texas"  "Parker, Colorado"
 */
function parseLocation(text: string): Location {
  const clean = text.trim();
  if (!clean) return { city: null, state: null };

  // "City, ST" or "City ST"
  const commaMatch = clean.match(/^(.+?),\s*([A-Z]{2})\s*$/);
  if (commaMatch && TWO_LETTER_STATES.has(commaMatch[2].toUpperCase())) {
    return { city: commaMatch[1].trim(), state: commaMatch[2].toUpperCase() };
  }

  // "City ST" — word space two-letter state
  const spaceMatch = clean.match(/^(.+?)\s+([A-Z]{2})\s*$/);
  if (spaceMatch && TWO_LETTER_STATES.has(spaceMatch[2].toUpperCase())) {
    return { city: spaceMatch[1].trim(), state: spaceMatch[2].toUpperCase() };
  }

  // "City, State-name"
  const lowerClean = clean.toLowerCase();
  for (const [stateName, abbr] of Object.entries(STATE_NAMES)) {
    const idx = lowerClean.lastIndexOf(stateName);
    if (idx >= 0) {
      const city = clean.slice(0, idx).replace(/,\s*$/, "").trim();
      return { city: city || null, state: abbr };
    }
  }

  // Fallback: whole string is city
  return { city: clean, state: null };
}

// ─── Education type inference ─────────────────────────────────────────────────

const EDUCATION_KW: Array<[string, EducationType]> = [
  ["microschool",       "microschool"],
  ["micro school",      "microschool"],
  ["learning pod",      "learning_pod"],
  ["learning co-op",    "co_op"],
  ["co-op",             "co_op"],
  ["coop",              "co_op"],
  ["classical",         "classical_education"],
  ["charlotte mason",   "classical_education"],
  ["montessori",        "montessori"],
  ["waldorf",           "classical_education"],
  ["unschooling",       "homeschool"],
  ["homeschool",        "homeschool"],
  ["home school",       "homeschool"],
  ["dyslexia",          "dyslexia_special_needs"],
  ["adhd",              "dyslexia_special_needs"],
  ["special needs",     "dyslexia_special_needs"],
  ["stem",              "stem_science"],
  ["science",           "stem_science"],
  ["math tutor",        "math"],
  ["math",              "math"],
  ["reading",           "reading_literacy"],
  ["literacy",          "reading_literacy"],
  ["phonics",           "reading_literacy"],
  ["sat prep",          "test_prep"],
  ["act prep",          "test_prep"],
  ["test prep",         "test_prep"],
  ["curriculum",        "curriculum"],
  ["tutor",             "tutor"],
  ["library",           "library_community_learning"],
  ["community learning","library_community_learning"],
  ["parent",            "parent_community"],
];

function inferEduTypeFromText(text: string): EducationType | null {
  const lower = text.toLowerCase();
  for (const [kw, type] of EDUCATION_KW) {
    if (lower.includes(kw)) return type;
  }
  return inferEducationType(text.split(/\s+/)[0] ?? text, text);
}

const AUDIENCE_KW: Array<[string, AudienceType]> = [
  ["parent", "parent"],
  ["mom", "parent"],
  ["family", "parent"],
  ["student", "student"],
  ["teacher", "educator"],
  ["tutor", "educator"],
  ["educator", "educator"],
  ["institution", "institution"],
  ["school", "institution"],
  ["academy", "institution"],
];

function inferAudienceFromText(text: string): AudienceType | null {
  const lower = text.toLowerCase();
  for (const [kw, type] of AUDIENCE_KW) {
    if (lower.includes(kw)) return type;
  }
  return null;
}

// ─── Single-line parsers ──────────────────────────────────────────────────────

function parsePipeDelimited(line: string, urls: string[]): Partial<ParsedDirectoryEntry> {
  const parts  = line.split("|").map((p) => p.trim());
  const name   = parts[0] || null;
  const locRaw = parts[1] ?? "";
  const catRaw = parts[2] ?? "";
  const urlStr = parts[3] ?? "";
  const { city, state } = parseLocation(locRaw);

  const allUrls = [...urls, ...extractAllUrls(urlStr)];
  const { ig: igUrl, web: websiteUrl } = splitIgAndWeb(allUrls);
  const handle = igUrl ? (igUrl.match(IG_URL_RE)?.[1]?.toLowerCase() ?? null) : null;
  // Look for inline @handle in any field
  const inlineHandle = handle ?? extractIgHandle(parts.find((p) => p.startsWith("@")) ?? "");

  const catText = [catRaw, parts[4] ?? ""].join(" ").trim();
  const eduType = catText ? inferEduTypeFromText(catText) : null;
  const audType = catText ? inferAudienceFromText(catText) : null;

  return {
    format: "pipe",
    name,
    handle: inlineHandle,
    city, state,
    category: catRaw || null,
    subcategory: parts[4] || null,
    educationType: eduType,
    audienceType: audType,
    websiteUrl,
    igUrl,
    socials: allUrls,
  };
}

function parseCsvLine(line: string, urls: string[]): Partial<ParsedDirectoryEntry> {
  const parts = line.split(",").map((p) => p.trim());
  const name  = parts[0] || null;

  // Detect if field[1] is a handle/URL (starts with @ or http)
  const field1 = parts[1] ?? "";
  const isHandle = field1.startsWith("@") || /^https?:\/\//i.test(field1);

  let handle: string | null   = null;
  let city: string | null     = null;
  let state: string | null    = null;
  let catRaw = "";
  let urlStr = "";

  if (isHandle) {
    handle = extractIgHandle(field1);
    city   = parts[2] || null;
    state  = TWO_LETTER_STATES.has((parts[3] ?? "").toUpperCase()) ? parts[3].toUpperCase() : null;
    catRaw = parts[4] ?? "";
    urlStr = parts[5] ?? "";
  } else {
    // name, city, state, category, url
    const loc = parseLocation(`${field1}, ${parts[2] ?? ""}`.trim().replace(/,\s*$/, ""));
    city   = loc.city;
    state  = loc.state;
    catRaw = parts[3] ?? "";
    urlStr = parts[4] ?? "";
  }

  const allUrls = [...urls, ...extractAllUrls(urlStr)];
  const { ig: igUrl, web: websiteUrl } = splitIgAndWeb(allUrls);

  return {
    format: "csv",
    name, handle: handle ?? (igUrl ? igUrl.match(IG_URL_RE)?.[1]?.toLowerCase() ?? null : null),
    city, state,
    category: catRaw || null,
    subcategory: null,
    educationType: catRaw ? inferEduTypeFromText(catRaw) : null,
    audienceType: catRaw ? inferAudienceFromText(catRaw) : null,
    websiteUrl, igUrl,
    socials: allUrls,
  };
}

function parseDashLine(line: string, urls: string[]): Partial<ParsedDirectoryEntry> {
  const parts  = line.split(/\s+-\s+/).map((p) => p.trim());
  const name   = parts[0] || null;
  const locRaw = parts[1] ?? "";
  const catRaw = parts[2] ?? "";

  const { city, state } = parseLocation(locRaw);
  const { ig: igUrl, web: websiteUrl } = splitIgAndWeb(urls);

  return {
    format: "dash",
    name,
    handle: igUrl ? igUrl.match(IG_URL_RE)?.[1]?.toLowerCase() ?? null : null,
    city, state,
    category: catRaw || null,
    subcategory: null,
    educationType: catRaw ? inferEduTypeFromText(catRaw) : null,
    audienceType: catRaw ? inferAudienceFromText(catRaw) : null,
    websiteUrl, igUrl,
    socials: urls,
  };
}

function parseTextBlock(line: string, urls: string[]): Partial<ParsedDirectoryEntry> {
  // Try to extract name (capitalised words at start), location, and education type from freeform
  const { ig: igUrl, web: websiteUrl } = splitIgAndWeb(urls);
  const handle = igUrl ? igUrl.match(IG_URL_RE)?.[1]?.toLowerCase() ?? null : null;

  // Try to find "City, ST" location pattern in text
  const locMatch = line.match(/\b([A-Z][a-z]+(?: [A-Z][a-z]+)*),\s*([A-Z]{2})\b/);
  const city  = locMatch?.[1] ?? null;
  const state = locMatch?.[2] && TWO_LETTER_STATES.has(locMatch[2]) ? locMatch[2] : null;

  // Guess name: capitalised words before a comma or dash
  const nameGuess = line.match(/^([A-Z][a-zA-Z']+(?:\s+[A-Z][a-zA-Z']+){0,4})/)?.[1] ?? null;

  const eduType  = inferEduTypeFromText(line);
  const audType  = inferAudienceFromText(line);

  return {
    format: "text_block",
    name: nameGuess,
    handle,
    city, state,
    category: null,
    subcategory: null,
    educationType: eduType !== "unknown" ? eduType : null,
    audienceType: audType,
    description: line.length > 60 ? line : null,
    websiteUrl, igUrl,
    socials: urls,
  };
}

// ─── Main line parser ─────────────────────────────────────────────────────────

function parseLine(rawLine: string): ParsedDirectoryEntry {
  const line     = rawLine.trim();
  const warnings: string[] = [];
  const urls     = extractAllUrls(line);

  // ── URL only (check BEFORE stripping — stripped would be empty for URL-only lines)
  if (/^https?:\/\/\S+$/.test(line)) {
    const { ig: igUrl, web: websiteUrl } = splitIgAndWeb(urls);
    const igHandle = igUrl ? igUrl.match(IG_URL_RE)?.[1]?.toLowerCase() ?? null : null;
    return {
      rawLine, format: "url",
      name: igHandle,         // use handle as name fallback for IdentitySeed
      handle: igHandle,
      city: null, state: null, category: null, subcategory: null,
      educationType: null, audienceType: null, description: null,
      websiteUrl, igUrl, socials: urls,
      sourceEvidence: urls.map((u) => `URL: ${u}`),
      warnings,
    };
  }

  // Strip URLs from the line for structural parsing
  const stripped = line.replace(URL_RE, "").replace(/\s{2,}/g, " ").trim();

  // ── @handle only
  const handleMatch = stripped.match(HANDLE_RE);
  if (handleMatch) {
    return {
      rawLine, format: "handle",
      name: null, handle: handleMatch[1].toLowerCase(),
      city: null, state: null, category: null, subcategory: null,
      educationType: null, audienceType: null, description: null,
      websiteUrl: null,
      igUrl: `https://instagram.com/${handleMatch[1].toLowerCase()}`,
      socials: [`https://instagram.com/${handleMatch[1].toLowerCase()}`],
      sourceEvidence: [`IG: @${handleMatch[1]}`],
      warnings,
    };
  }

  // ── @handle followed by description text (e.g. "@stemkids_mike STEM tutor, Chicago IL")
  const handleWithDesc = stripped.match(/^@([a-z0-9._]{3,30})\s+(.+)/i);
  if (handleWithDesc) {
    const handle = handleWithDesc[1].toLowerCase();
    const desc   = handleWithDesc[2];
    const { ig: igUrl, web: websiteUrl } = splitIgAndWeb(urls);
    const eduType  = inferEduTypeFromText(desc);
    const audType  = inferAudienceFromText(desc);
    const locMatch = desc.match(/\b([A-Z][a-z]+(?: [A-Z][a-z]+)*),\s*([A-Z]{2})\b/);
    const city  = locMatch?.[1] ?? null;
    const state = locMatch?.[2] && TWO_LETTER_STATES.has(locMatch[2]) ? locMatch[2] : null;
    return buildEntry(rawLine, {
      format: "text_block",
      name: null,
      handle,
      city, state,
      category: null,
      subcategory: null,
      educationType: eduType !== "unknown" ? eduType as import("@/lib/studios/creator-lab/hashtag-harvest/education-config").EducationType : null,
      audienceType: audType,
      description: desc,
      websiteUrl,
      igUrl: igUrl ?? (handle ? `https://instagram.com/${handle}` : null),
      socials: urls,
    }, urls, warnings);
  }

  // ── Pipe-delimited (≥2 pipes)
  if ((stripped.match(/\|/g) ?? []).length >= 1) {
    const partial = parsePipeDelimited(stripped, urls);
    return buildEntry(rawLine, partial, urls, warnings);
  }

  // ── Dash-delimited (pattern: Word - Word - Word)
  if (/\s+-\s+/.test(stripped) && (stripped.match(/\s+-\s+/g) ?? []).length >= 1) {
    const partial = parseDashLine(stripped, urls);
    return buildEntry(rawLine, partial, urls, warnings);
  }

  // ── CSV (multiple commas, likely structured)
  if ((stripped.match(/,/g) ?? []).length >= 2) {
    const partial = parseCsvLine(stripped, urls);
    return buildEntry(rawLine, partial, urls, warnings);
  }

  // ── Single comma: may be "Name, City ST" or similar
  if (stripped.includes(",")) {
    const partial = parseCsvLine(stripped, urls);
    return buildEntry(rawLine, partial, urls, warnings);
  }

  // ── Single word/name — could be name only or category
  if (stripped.length > 0 && stripped.split(/\s+/).length <= 4 && !stripped.includes(".")) {
    return {
      rawLine, format: "name_only",
      name: stripped, handle: null,
      city: null, state: null, category: null, subcategory: null,
      educationType: inferEduTypeFromText(stripped) !== "unknown"
        ? inferEduTypeFromText(stripped) : null,
      audienceType: inferAudienceFromText(stripped),
      description: null,
      websiteUrl: urls[0] ?? null, igUrl: null, socials: urls,
      sourceEvidence: [],
      warnings: stripped.length < 4 ? ["Very short — may not produce useful candidates"] : [],
    };
  }

  // ── Freeform text block
  const partial = parseTextBlock(stripped, urls);
  return buildEntry(rawLine, partial, urls, warnings);
}

function buildEntry(
  rawLine: string,
  partial: Partial<ParsedDirectoryEntry>,
  urls: string[],
  warnings: string[],
): ParsedDirectoryEntry {
  const sourceEvidence: string[] = [
    ...(partial.name ? [`Name: ${partial.name}`] : []),
    ...(partial.city || partial.state ? [`Location: ${[partial.city, partial.state].filter(Boolean).join(", ")}`] : []),
    ...(partial.category ? [`Category: ${partial.category}`] : []),
    ...(partial.websiteUrl ? [`Website: ${partial.websiteUrl}`] : []),
    ...(partial.igUrl ? [`IG: ${partial.igUrl}`] : []),
  ];

  return {
    rawLine,
    format: partial.format ?? "text_block",
    name: partial.name ?? null,
    handle: partial.handle ?? null,
    city: partial.city ?? null,
    state: partial.state ?? null,
    category: partial.category ?? null,
    subcategory: partial.subcategory ?? null,
    educationType: partial.educationType ?? null,
    audienceType: partial.audienceType ?? null,
    description: partial.description ?? null,
    websiteUrl: partial.websiteUrl ?? null,
    igUrl: partial.igUrl ?? null,
    socials: urls,
    sourceEvidence,
    warnings,
  };
}

// ─── Main export: textarea → ParsedDirectoryEntry[] ──────────────────────────

export function parseDirectoryText(text: string): ParsedDirectoryEntry[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"))
    .map(parseLine);
}

// ─── ParsedDirectoryEntry → IdentitySeed ─────────────────────────────────────

export function directoryEntryToIdentitySeed(
  entry: ParsedDirectoryEntry,
  opts: {
    batchId: string;
    runId: string;
    seedDate: string;
  },
): IdentitySeed {
  const name = entry.name ?? entry.handle ?? "unknown";

  const knownUrls: MatchedUrl[] = [
    ...(entry.websiteUrl
      ? [{ platform: "website", url: entry.websiteUrl, confidence: 30, matchReason: "Directory listing website" }]
      : []),
    ...(entry.igUrl
      ? [{ platform: "instagram", url: entry.igUrl, confidence: 45, matchReason: "IG URL from directory" }]
      : []),
  ];

  const extraEvidence: string[] = [
    ...entry.sourceEvidence,
    ...(entry.description ? [`Description: ${entry.description.slice(0, 120)}`] : []),
  ].filter(Boolean);

  return {
    name,
    handle: entry.handle,
    city: entry.city,
    state: entry.state,
    vertical: "education",
    category: entry.category,
    subcategory: entry.subcategory,
    sourcePlatform: "directory_import",
    sourceTool: "education_directory_import",
    seedDate: opts.seedDate,
    batchId: opts.batchId,
    runId: opts.runId,
    sourceHashtag: entry.category ?? entry.educationType ?? null,
    sourceHashtags: [entry.category, entry.educationType].filter(Boolean) as string[],
    educationType: entry.educationType,
    audienceType: entry.audienceType,
    sourceTopic: entry.category ?? entry.educationType ?? null,
    knownUrls,
    bio: entry.description,
    extraEvidence,
    services: [],
  };
}
