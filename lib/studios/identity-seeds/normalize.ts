// lib/studios/identity-seeds/normalize.ts
// Generates ranked IG handle candidates from an IdentitySeed.
// Vertical-aware: education seeds use educator title patterns,
// beauty/fitness seeds use business + personal name patterns.

import type { IdentitySeed } from "./types";

// ─── City abbreviation map ────────────────────────────────────────────────────

const CITY_ABBREVS: Record<string, string[]> = {
  houston:         ["htx"],
  chicago:         ["chi"],
  atlanta:         ["atl"],
  dallas:          ["dfw"],
  miami:           ["mia"],
  "new york":      ["nyc"],
  "los angeles":   ["la"],
  phoenix:         ["phx"],
  nashville:       ["nash"],
  seattle:         ["sea"],
  portland:        ["pdx"],
  boston:          ["bos"],
  denver:          ["den", "dnvr"],
  austin:          ["atx"],
  charlotte:       ["clt"],
  detroit:         ["det"],
  memphis:         ["mem"],
  washington:      ["dc", "dmv"],
  "las vegas":     ["lvnv"],
  minneapolis:     ["mpls"],
  baltimore:       ["bmore"],
  richmond:        ["rva"],
  "new orleans":   ["nola"],
  "san antonio":   ["satx"],
  "san diego":     ["sd"],
  "san francisco": ["sf"],
  columbus:        ["cbus"],
  jacksonville:    ["jax"],
  raleigh:         ["rdu"],
  tampa:           ["tpa"],
  orlando:         ["orl"],
  "salt lake":     ["slc"],
  "kansas city":   ["kc"],
};

export function getCityAbbrevs(city: string): string[] {
  const lower = city.toLowerCase();
  for (const [key, abbrs] of Object.entries(CITY_ABBREVS)) {
    if (lower.includes(key)) return abbrs;
  }
  // Fallback: first 3 alphabetic chars of city
  const alpha = lower.replace(/[^a-z]/g, "");
  return alpha.length >= 3 ? [alpha.slice(0, 3)] : [];
}

// ─── Noise words by vertical ──────────────────────────────────────────────────

const BEAUTY_NOISE = new Set([
  "beauty", "salon", "studio", "bar", "suite", "spa", "co", "the",
  "lash", "nail", "hair", "brow", "brows", "makeup", "mua", "ink",
  "braids", "locs", "by", "and", "&", "a", "of",
]);

const EDUCATION_NOISE = new Set([
  "learning", "tutoring", "education", "academy", "center", "services",
  "school", "homeschool", "teaching", "teachers", "tutors",
  "math", "science", "reading", "stem", "the", "a", "an", "and", "&",
  "by", "of", "for", "with", "at",
]);

const FITNESS_NOISE = new Set([
  "fitness", "gym", "training", "coach", "coaching", "studio", "fit",
  "health", "wellness", "athletic", "sport", "sports", "the", "a", "an",
  "and", "&", "by", "of",
]);

const GENERIC_NOISE = new Set(["the", "a", "an", "and", "&", "by", "of", "for"]);

function getNoiseWords(vertical: string): Set<string> {
  switch (vertical.toLowerCase()) {
    case "beauty":    return BEAUTY_NOISE;
    case "education": return EDUCATION_NOISE;
    case "fitness":   return FITNESS_NOISE;
    default:          return GENERIC_NOISE;
  }
}

// ─── Service terms for suffix appending ──────────────────────────────────────

const BEAUTY_SERVICE_TERMS = new Set([
  "beauty", "lash", "nail", "hair", "brow", "braids", "locs", "makeup", "salon", "studio",
]);
const EDUCATION_SERVICE_TERMS = new Set([
  "learning", "academy", "education", "tutor", "tutoring", "math", "science", "reading", "stem",
]);
const FITNESS_SERVICE_TERMS = new Set([
  "fitness", "training", "coach", "gym", "health", "wellness",
]);

function getServiceTerms(vertical: string): Set<string> {
  switch (vertical.toLowerCase()) {
    case "beauty":    return BEAUTY_SERVICE_TERMS;
    case "education": return EDUCATION_SERVICE_TERMS;
    case "fitness":   return FITNESS_SERVICE_TERMS;
    default:          return new Set();
  }
}

// ─── Vertical-specific extra patterns ────────────────────────────────────────

function getVerticalPatterns(
  vertical: string,
  first: string,
  last: string,
  category: string | null | undefined,
): string[] {
  if (!vertical) return [];
  switch (vertical.toLowerCase()) {
    case "education": {
      // Educators often use "mrslast", "mslast", "mrlast", "teacherlast", "coachfirst"
      const patterns: string[] = [];
      if (last) {
        patterns.push("mrs" + last, "ms" + last, "mr" + last);
        patterns.push("teacher" + last, "coach" + first);
      }
      if (category) {
        const cat = category.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (last) patterns.push(first + cat);
      }
      return patterns;
    }
    case "fitness": {
      // Fitness coaches often use "coachfirst", "coachlast", "firstfit"
      const patterns: string[] = [];
      if (first) patterns.push("coach" + first, first + "fit", first + "strong");
      if (last)  patterns.push("coach" + last);
      return patterns;
    }
    default:
      return [];
  }
}

// ─── Main candidate generator ─────────────────────────────────────────────────

/**
 * Generates a ranked list of likely IG handle candidates for an IdentitySeed.
 * Returns up to maxCandidates (default 10) candidates, most-likely first.
 *
 * If seed.handle is provided (known IG), it is always the first candidate.
 */
export function generateIdentityCandidates(
  seed: IdentitySeed,
  maxCandidates = 10,
): string[] {
  // If we already know the exact handle, it is candidate #1
  const knownHandle = seed.handle?.replace(/^@/, "").trim().toLowerCase();
  const prefix: string[] = knownHandle && knownHandle.length >= 3 ? [knownHandle] : [];

  if (!seed.name) return prefix;

  const clean = seed.name.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  const words = clean.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return prefix;

  const noiseWords   = getNoiseWords(seed.vertical);
  const serviceTerms = getServiceTerms(seed.vertical);

  // Personal/meaningful words (noise stripped)
  const personal  = words.filter((w) => !noiseWords.has(w));
  const allJoined = words.join("");

  const first     = personal[0] ?? words[0];
  const last      = personal[1] ?? words[1] ?? "";
  const firstLast = first + last;

  // Specialty/service word
  const specialty = words.find((w) => serviceTerms.has(w)) ?? "";

  const cityAbbrs = seed.city ? getCityAbbrevs(seed.city) : [];

  const verticalPatterns = getVerticalPatterns(seed.vertical, first, last, seed.category);

  const raw: string[] = [
    ...prefix,

    // Core personal handles — highest hit rate
    firstLast,                           // janellecarter
    first + "." + last,                  // janelle.carter
    first + "_" + last,                  // janelle_carter

    // Vertical-specific title/role patterns
    ...verticalPatterns,

    // Full business/name string as handle
    allJoined,                           // janellecarterbeauty

    // Personal + specialty suffix
    ...(specialty ? [firstLast + specialty, first + specialty] : []),

    // Initial.last and initiallast
    ...(last ? [first[0] + "." + last, first[0] + last] : []),

    // First name only (common for solo operators/educators)
    first,

    // With city abbreviation
    ...cityAbbrs.flatMap((abbr) => [
      firstLast + abbr,
      first + abbr,
    ]),
  ];

  // Deduplicate, filter too-short or too-long
  const seen = new Set<string>();
  return raw
    .map((h) => h.replace(/[^a-z0-9._]/g, ""))
    .filter((h) => {
      if (h.length < 3 || h.length > 30) return false;
      if (seen.has(h)) return false;
      seen.add(h);
      return true;
    })
    .slice(0, maxCandidates);
}
