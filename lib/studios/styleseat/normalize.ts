// lib/studios/styleseat/normalize.ts
// Normalizes StyleSeat operator data into resolver-ready inputs.
// Generates IG handle candidates from names + city context.
// Builds IdentitySeed from operator data (for the shared assembler).
// Also exports legacy operatorToUpsertInput for backward compatibility.

import type { StyleSeatOperator, StyleSeatCategory } from "./types";
import type { UpsertInput } from "@/lib/studios/prospects/store";
import type { ResolvedProfile } from "@/lib/studios/creator-lab/ig-stubs/types";
import type { IdentitySeed } from "@/lib/studios/identity-seeds/types";
import type { ProspectEvidence, StructuredProspectEvidence } from "@/lib/studios/prospects/types";
import { buildProspectSourcePath } from "@/lib/studios/prospects/source-path";

// ─── City abbreviation map ────────────────────────────────────────────────────

const CITY_ABBREVS: Record<string, string[]> = {
  houston:      ["htx"],
  chicago:      ["chi"],
  atlanta:      ["atl"],
  dallas:       ["dfw"],
  miami:        ["mia"],
  "new york":   ["nyc"],
  "los angeles":["la"],
  phoenix:      ["phx"],
  nashville:    ["nash"],
  seattle:      ["sea"],
  portland:     ["pdx"],
  boston:       ["bos"],
  denver:       ["den"],
  austin:       ["atx"],
  charlotte:    ["clt"],
  detroit:      ["det"],
  memphis:      ["mem"],
  washington:   ["dc", "dmv"],
  "las vegas":  ["lvnv"],
  minneapolis:  ["mpls"],
  baltimore:    ["bmore"],
  richmond:     ["rva"],
  "new orleans":["nola"],
};

function getCityAbbrevs(city: string): string[] {
  const lower = city.toLowerCase();
  for (const [key, abbrs] of Object.entries(CITY_ABBREVS)) {
    if (lower.includes(key)) return abbrs;
  }
  // Fallback: first 3 alphabetic chars
  const alpha = lower.replace(/[^a-z]/g, "");
  return alpha.length >= 3 ? [alpha.slice(0, 3)] : [];
}

// ─── Beauty business noise words (stripped to find personal name core) ────────

const BIZ_NOISE = new Set([
  "beauty", "salon", "studio", "bar", "suite", "spa", "co", "the",
  "lash", "nail", "hair", "brow", "brows", "makeup", "mua", "ink",
  "braids", "locs", "by", "and", "&", "a", "of",
]);

// ─── IG handle candidate generator ───────────────────────────────────────────

/**
 * Generates a ranked list of likely IG handle candidates for a StyleSeat operator.
 * Returns up to 8 candidates, most-likely first.
 */
export function generateIgHandleCandidates(name: string, city?: string): string[] {
  const clean = name.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  const words = clean.split(/\s+/).filter((w) => w.length > 0);

  if (words.length === 0) return [];

  // Personal name words (strip business noise)
  const personal = words.filter((w) => !BIZ_NOISE.has(w));
  const allJoined = words.join("");

  const first = personal[0] ?? words[0];
  const last  = personal[1] ?? words[1] ?? "";
  const firstLast = first + last;
  const firstInitial = first[0] ?? "";

  // Specialty word (last business-noise word that's a service term)
  const SERVICE_TERMS = new Set(["beauty", "lash", "nail", "hair", "brow", "braids", "locs", "makeup", "salon", "studio"]);
  const specialty = words.find((w) => SERVICE_TERMS.has(w)) ?? "";

  const cityAbbrs = city ? getCityAbbrevs(city) : [];

  const raw: string[] = [
    // Core personal handles — highest hit rate
    firstLast,                              // janellecarter
    first + "." + last,                     // janelle.carter
    first + "_" + last,                     // janelle_carter
    first[0] + (last ? "." + last : ""),    // j.carter (only with separator)

    // Full business name as handle
    allJoined,                              // janellecarterbeauty

    // Personal + specialty suffix
    ...(specialty ? [firstLast + specialty, first + specialty] : []),

    // Initial + last
    ...(last ? [firstInitial + last] : []),

    // First name only (common for solo operators)
    first,

    // With city abbreviation
    ...cityAbbrs.flatMap((abbr) => [
      firstLast + abbr,                     // janellecarterhtx
      first + abbr,                         // janellethx
    ]),
  ];

  // Deduplicate, filter too-short or too-long, return capped list
  const seen = new Set<string>();
  return raw
    .map((h) => h.replace(/[^a-z0-9._]/g, ""))
    .filter((h) => {
      if (h.length < 3 || h.length > 30) return false;
      if (seen.has(h)) return false;
      seen.add(h);
      return true;
    })
    .slice(0, 8);
}

// ─── HarvestContext for StyleSeat runs ────────────────────────────────────────

export interface StyleSeatHarvestContext {
  runId: string;
  batchId: string;
  harvestDate: string;   // ISO date
  vertical: "beauty";
  sourcePlatform: "styleseat_harvest";
  sourceTool: "styleseat_harvest";
  market: string;
  state: string;
  categories: StyleSeatCategory[];
}

export interface NormalizedStyleSeatRecord {
  discoveryMode: StyleSeatOperator["discoveryMode"];
  seedUrl: string | null;
  sourceUrl: string | null;
  profileUrl: string;
  displayName: string;
  normalizedName: string;
  city: string;
  state: string;
  derivedMarket: string;
  categories: StyleSeatCategory[];
  specialtyTags: string[];
  serviceKeywords: string[];
  possibleIgQueries: string[];
  rawText: string | null;
}

export function normalizeStyleSeatRecord(operator: StyleSeatOperator): NormalizedStyleSeatRecord {
  const category = operator.categories[0] ?? "hair";
  const serviceKeywords = Array.from(new Set([
    ...operator.services.map((s) => s.name.toLowerCase()),
    ...operator.specialties.map((s) => s.toLowerCase()),
    category,
  ])).filter(Boolean).slice(0, 12);
  const specialty = serviceKeywords[0] ?? category;
  const slug = operator.slug;
  const possibleIgQueries = [
    `${operator.name} ${operator.city} ${specialty}`,
    `${operator.name} ${operator.state} ${specialty}`,
    `${operator.name} StyleSeat`,
    `${slug} instagram`,
    ...serviceKeywords.slice(0, 4).map((kw) => `${operator.name} ${kw} instagram`),
  ].filter(Boolean);

  return {
    discoveryMode: operator.discoveryMode,
    seedUrl: operator.seedUrl ?? null,
    sourceUrl: operator.sourceUrl ?? null,
    profileUrl: operator.styleseatUrl,
    displayName: operator.name,
    normalizedName: operator.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(),
    city: operator.city,
    state: operator.state,
    derivedMarket: [operator.city, operator.state].filter(Boolean).join(", "),
    categories: operator.categories,
    specialtyTags: operator.specialties,
    serviceKeywords,
    possibleIgQueries,
    rawText: operator.rawText ?? operator.bio ?? null,
  };
}

// ─── Operator → UpsertInput ───────────────────────────────────────────────────

/**
 * Converts a StyleSeat operator + resolver output into a ProspectRecord UpsertInput.
 * The StyleSeat URL is always included in allMatchedUrls as a high-confidence anchor.
 */
export function operatorToUpsertInput(
  operator: StyleSeatOperator,
  igHandleFound: string | null,
  profiles: ResolvedProfile[],
  ctx: StyleSeatHarvestContext,
): UpsertInput {
  const category = operator.categories[0] ?? null;
  const handle = igHandleFound ?? operator.slug;

  const sourcePath = buildProspectSourcePath({
    vertical:   "Beauty",
    platform:   "StyleSeat",
    sourceTool: "StyleSeat Harvest",
    date:       ctx.harvestDate,
    hashtag:    category,
  });

  // StyleSeat profile as a known-good anchor URL
  const styleseatUrl: import("@/lib/studios/prospects/types").MatchedUrl = {
    platform:    "styleseat",
    url:         operator.styleseatUrl,
    confidence:  operator.reviewCount > 5 ? 75 : 50,  // reviews = real business
    matchReason: `StyleSeat listing — ${operator.reviewCount} reviews`,
  };

  // Booking platform profiles from the resolver
  const resolverUrls: import("@/lib/studios/prospects/types").MatchedUrl[] = profiles.map((p) => ({
    platform:    p.platform,
    url:         p.url,
    confidence:  p.confidenceScore,
    matchReason: p.matchReason,
  }));

  const allMatchedUrls = [styleseatUrl, ...resolverUrls]
    .sort((a, b) => b.confidence - a.confidence);

  const bestBookingMatch = profiles[0] ?? null;
  const bestMatch = bestBookingMatch
    ? {
        platform:    bestBookingMatch.platform,
        url:         bestBookingMatch.url,
        confidence:  bestBookingMatch.confidenceScore,
        matchReason: bestBookingMatch.matchReason,
      }
    : {
        platform:    styleseatUrl.platform,
        url:         styleseatUrl.url,
        confidence:  styleseatUrl.confidence,
        matchReason: styleseatUrl.matchReason,
      };

  const services = Array.from(
    new Set([
      ...operator.services.map((s) => s.name),
      ...profiles.flatMap((p) => p.detectedServices),
    ])
  ).slice(0, 20);

  const profileEvidence: StructuredProspectEvidence = {
    type:            "styleseat_profile",
    source:          "styleseat_harvest",
    url:             operator.styleseatUrl,
    label:           operator.name,
    city:            [operator.city, operator.state].filter(Boolean).join(", "),
    state:           operator.state,
    serviceCategory: category,
    confidence:      0.65,
  };

  const evidence: ProspectEvidence[] = [
    profileEvidence,
    `StyleSeat: ${operator.styleseatUrl}`,
    ...(operator.reviewCount > 0 ? [`${operator.reviewCount} StyleSeat reviews`] : []),
    ...(operator.rating ? [`Rating: ${operator.rating}/5`] : []),
    ...operator.specialties.map((s) => `specialty: ${s}`),
    ...(operator.bio ? [`Bio: ${operator.bio.slice(0, 120)}`] : []),
    ...profiles.flatMap((p) => p.evidenceSnippets).slice(0, 6),
  ].filter(Boolean).slice(0, 15);

  const locationGuess = `${operator.city}, ${operator.state}`;

  const overallConfidence = bestBookingMatch
    ? Math.min(100, Math.round((bestBookingMatch.confidenceScore + styleseatUrl.confidence) / 2))
    : styleseatUrl.confidence;

  const platforms = Array.from(
    new Set(["styleseat", ...profiles.map((p) => p.platform)])
  );

  return {
    source: {
      sourceType:        "styleseat_harvest",
      batchId:           ctx.batchId,
      sourceHandle:      handle,
      sourceDisplayName: operator.name,
    },
    vertical:       "beauty",
    sourcePlatform: "styleseat_harvest",
    sourceTool:     "styleseat_harvest",
    sourceHashtag:  category,
    sourceHashtags: operator.categories,
    sourcePath,
    runId:          ctx.runId,
    harvestDate:    ctx.harvestDate,
    identity: {
      name:          operator.name,
      handle,
      categoryGuess: CATEGORY_GUESS[category ?? "hair"] ?? category,
      locationGuess,
    },
    educationType:  null,
    audienceType:   null,
    sourceTopic:    null,
    platforms,
    bestMatch,
    services,
    allMatchedUrls,
    evidence,
    confidence: {
      identityMatch: igHandleFound ? 60 : 0,
      bookingMatch:  bestBookingMatch ? bestBookingMatch.confidenceScore : 0,
      categoryMatch: services.length > 0 ? Math.min(100, services.length * 12) : 30,
      locationMatch: 60,   // we know the city from StyleSeat
      overall:       overallConfidence,
    },
    suggestedValidationStatus: igHandleFound && overallConfidence >= 50
      ? "needs_review"
      : "needs_review",
  };
}

// ─── Operator → IdentitySeed (for shared assembler) ──────────────────────────

/**
 * Converts a StyleSeatOperator into an IdentitySeed for the shared assembler.
 * The StyleSeat profile URL is pre-included as a high-confidence anchor.
 */
export function operatorToIdentitySeed(
  operator: StyleSeatOperator,
  ctx: StyleSeatHarvestContext,
): IdentitySeed {
  const category = operator.categories[0] ?? null;

  const knownUrls: import("@/lib/studios/prospects/types").MatchedUrl[] = [
    {
      platform:    "styleseat",
      url:         operator.styleseatUrl,
      confidence:  operator.reviewCount > 5 ? 75 : 50,
      matchReason: `StyleSeat listing — ${operator.reviewCount} reviews`,
    },
  ];

  const profileEvidence: StructuredProspectEvidence = {
    type:            "styleseat_profile",
    source:          "styleseat_harvest",
    url:             operator.styleseatUrl,
    label:           operator.name,
    city:            [operator.city, operator.state].filter(Boolean).join(", "),
    state:           operator.state,
    serviceCategory: category,
    confidence:      0.65,
  };

  const extraEvidence: ProspectEvidence[] = [
    profileEvidence,
    ...(operator.reviewCount > 0 ? [`${operator.reviewCount} StyleSeat reviews`] : []),
    ...(operator.rating ? [`Rating: ${operator.rating}/5`] : []),
    ...operator.specialties.map((s) => `specialty: ${s}`),
  ].filter(Boolean);

  return {
    name:           operator.name,
    handle:         null,               // no known IG handle — assembler will generate candidates
    city:           operator.city,
    state:          operator.state,
    vertical:       "beauty",
    category:       CATEGORY_GUESS[category ?? "hair"] ?? category,
    subcategory:    category,
    sourcePlatform: "styleseat_harvest",
    sourceTool:     "styleseat_harvest",
    seedDate:       ctx.harvestDate,
    batchId:        ctx.batchId,
    runId:          ctx.runId,
    sourceHashtag:  category,
    sourceHashtags: operator.categories,
    educationType:  null,
    audienceType:   null,
    sourceTopic:    null,
    knownUrls,
    bio:            operator.bio,
    extraEvidence,
    services:       operator.services.map((s) => s.name),
  };
}

const CATEGORY_GUESS: Partial<Record<string, string>> = {
  hair:       "Hair Stylist",
  braids:     "Braider",
  barber:     "Barber",
  locs:       "Loc Stylist",
  makeup:     "MUA",
  lashes:     "Lash Artist",
  brows:      "Brow Artist",
  nails:      "Nail Tech",
  extensions: "Hair Extensions",
};
