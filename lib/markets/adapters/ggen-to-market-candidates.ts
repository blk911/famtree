// lib/markets/adapters/ggen-to-market-candidates.ts

import path from "path";
import {
  getGgenDiscoveryStorePath,
  listGgenDiscoveryRuns,
  loadGgenDiscoveryRun,
} from "@/lib/intelligence/salon/ggen-seed-discovery/store";
import type { GgenSeedDiscoveryResult } from "@/lib/intelligence/salon/ggen-seed-discovery/types";
import {
  clampMarketScore,
  computeAcquisitionScore,
  resolveCategoryBucketsFromText,
} from "@/lib/markets/category-buckets";
import {
  normalizeBookingKey,
  normalizeOperatorName,
  normalizePhoneKeys,
  normalizeSocialHandles,
  normalizeWebsiteDomain,
} from "@/lib/markets/normalize-identity";
import type {
  MarketCandidate,
  MarketRecommendedAction,
  MarketVerificationStatus,
} from "@/lib/markets/types";

export const GGEN_SOURCE_KEY = "glossgenius";

const SOURCE_PROVIDER = "glossgenius";
const SOURCE_TYPE = "ggen_seed_discovery";

type ConsolidatedGgenResult = GgenSeedDiscoveryResult & {
  runCreatedAt: string;
};

function slugifyLocationPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildLocationSlug(city: string | null, state: string | null): string {
  const parts = [city, state]
    .filter((part): part is string => Boolean(part?.trim()))
    .map((part) => slugifyLocationPart(part));
  return parts.length > 0 ? parts.join("-") : "unknown";
}

function extractGlossGeniusSlug(bookingUrl: string): string {
  try {
    const host = new URL(bookingUrl).hostname.replace(/^www\./, "").toLowerCase();
    if (host.endsWith(".glossgenius.com")) {
      return host.split(".")[0] ?? "unknown";
    }
  } catch {
    // fall through
  }
  return "unknown";
}

function normalizeBookingUrl(url: string): string {
  try {
    return new URL(url).href.replace(/\/$/, "").toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function hasPhone(phones: string[]): boolean {
  return phones.some((phone) => phone.replace(/\D/g, "").length >= 10);
}

function computeContactabilityScore(input: {
  phones: string[];
  bookingLinks: string[];
  website?: string;
  externalLinks: string[];
  socialLinks: string[];
  bio?: string;
  categories: string[];
}): number {
  let score = 0;
  if (hasPhone(input.phones)) score += 40;
  if (input.bookingLinks.length > 0) score += 20;
  if (input.website?.trim() || input.externalLinks.length > 0) score += 15;
  if (input.socialLinks.length > 0) score += 15;
  if (input.bio?.trim() || input.categories.length > 0) score += 10;
  return clampMarketScore(score);
}

function computeIdentityScore(input: {
  profileUrl?: string;
  operatorName: string;
  businessName?: string;
  locationSlug: string;
  imageUrl?: string;
}): number {
  let score = 0;
  if (input.profileUrl?.trim()) score += 30;
  if (input.operatorName.trim()) score += 25;
  if (input.businessName?.trim()) score += 20;
  if (input.locationSlug !== "unknown") score += 15;
  if (input.imageUrl?.trim()) score += 10;
  return clampMarketScore(score);
}

function resolveVerificationStatus(input: {
  phones: string[];
  profileUrl?: string;
  bookingLinks: string[];
}): MarketVerificationStatus {
  const phone = hasPhone(input.phones);
  const profile = Boolean(input.profileUrl?.trim());
  const booking = input.bookingLinks.length > 0;

  if (phone && (booking || profile)) return "live_verified";
  if (profile || booking) return "matched";
  return "discovered";
}

function resolveRecommendedAction(input: {
  phones: string[];
  bookingLinks: string[];
}): MarketRecommendedAction {
  if (hasPhone(input.phones)) return "call_or_text";
  if (input.bookingLinks.length > 0) return "booking_profile_review";
  return "needs_manual_validation";
}

async function loadConsolidatedGgenResults(): Promise<{
  results: ConsolidatedGgenResult[];
  skippedCount: number;
  artifactPath: string;
  lastImportedAt: string;
}> {
  const storePath = getGgenDiscoveryStorePath();
  const artifactPath = path.relative(process.cwd(), storePath);
  const runs = await listGgenDiscoveryRuns();

  if (runs.length === 0) {
    return {
      results: [],
      skippedCount: 0,
      artifactPath,
      lastImportedAt: new Date(0).toISOString(),
    };
  }

  const byBookingUrl = new Map<string, ConsolidatedGgenResult>();
  let skippedCount = 0;

  for (const summary of runs) {
    const run = await loadGgenDiscoveryRun(summary.runId);
    if (!run) continue;

    for (const result of run.results) {
      if (!result.found || !result.bookingUrl?.trim()) {
        skippedCount += 1;
        continue;
      }

      const key = normalizeBookingUrl(result.bookingUrl);
      const existing = byBookingUrl.get(key);
      if (!existing || result.confidence > existing.confidence) {
        byBookingUrl.set(key, { ...result, runCreatedAt: run.createdAt });
      } else {
        skippedCount += 1;
      }
    }
  }

  const results = Array.from(byBookingUrl.values());
  const lastImportedAt = runs.reduce(
    (latest, run) => (run.createdAt > latest ? run.createdAt : latest),
    runs[0]!.createdAt,
  );

  return { results, skippedCount, artifactPath, lastImportedAt };
}

function mapGgenResult(result: ConsolidatedGgenResult): MarketCandidate {
  const operatorName = result.normalizedName || normalizeOperatorName(result.businessName);
  const displayName = result.businessName.trim() || operatorName;
  const businessName = result.businessName.trim() || displayName;
  const locationSlug = buildLocationSlug(result.city, result.state);
  const bookingUrl = result.bookingUrl!.trim();
  const ggSlug = extractGlossGeniusSlug(bookingUrl);
  const categories = result.category?.trim() ? [result.category.trim()] : [];
  const categoryBuckets = resolveCategoryBucketsFromText(
    result.category,
    result.businessName,
    ...categories,
  );
  const phones: string[] = [];
  const emails: string[] = [];
  const bookingLinks = [bookingUrl];
  const website = undefined;
  const externalLinks: string[] = [];
  const socialLinks: string[] = [];
  const profileUrl = bookingUrl;

  const contactabilityScore = computeContactabilityScore({
    phones,
    bookingLinks,
    website,
    externalLinks,
    socialLinks,
    categories,
  });
  const identityScore = computeIdentityScore({
    profileUrl,
    operatorName,
    businessName,
    locationSlug,
  });
  const acquisitionScore = computeAcquisitionScore(contactabilityScore, categoryBuckets);
  const verificationStatus = resolveVerificationStatus({ phones, profileUrl, bookingLinks });
  const recommendedAction = resolveRecommendedAction({ phones, bookingLinks });

  const notesParts = [
    result.importCandidate ? "import candidate" : null,
    result.discoverySource ? `source: ${result.discoverySource}` : null,
    result.confidence > 0 ? `confidence: ${result.confidence}` : null,
    result.matchedProspectIds.length > 0
      ? `matched prospects: ${result.matchedProspectIds.length}`
      : null,
  ].filter(Boolean);

  return {
    candidateKey: `glossgenius:${ggSlug}`,
    sourceProvider: SOURCE_PROVIDER,
    sourceType: SOURCE_TYPE,
    operatorName,
    displayName,
    professionalName: undefined,
    businessName,
    locationName: [result.city, result.state].filter(Boolean).join(", ") || undefined,
    locationSlug,
    city: result.city ?? undefined,
    state: result.state ?? undefined,
    categories,
    categoryBuckets,
    phones,
    emails,
    bookingLinks,
    website,
    externalLinks,
    socialLinks,
    profileUrl,
    imageUrl: undefined,
    bio: undefined,
    parentContainerId: "glossgenius:platform",
    parentContainerBrand: "GlossGenius",
    parentContainerType: "booking_platform",
    containerRelationship: "independent_operator",
    verificationStatus,
    contactabilityScore,
    identityScore,
    acquisitionScore,
    recommendedAction,
    reviewStatus: "unreviewed",
    notes: notesParts.join(" · "),
    createdAt: result.runCreatedAt,
    updatedAt: result.runCreatedAt,
    normalizedOperatorName: normalizeOperatorName(displayName),
    normalizedPhoneKeys: normalizePhoneKeys(phones),
    normalizedWebsiteDomain: website ? normalizeWebsiteDomain(website) : undefined,
    normalizedSocialHandles: normalizeSocialHandles(socialLinks),
    normalizedBookingKey: normalizeBookingKey(bookingUrl),
  };
}

export interface GgenAdapterResult {
  sourceKey: typeof GGEN_SOURCE_KEY;
  artifactPath: string;
  lastImportedAt: string;
  candidates: MarketCandidate[];
  importedCount: number;
  skippedCount: number;
}

export async function adaptGgenToMarketCandidates(): Promise<GgenAdapterResult> {
  const { results, skippedCount, artifactPath, lastImportedAt } = await loadConsolidatedGgenResults();
  const candidates = results.map(mapGgenResult);

  return {
    sourceKey: GGEN_SOURCE_KEY,
    artifactPath,
    lastImportedAt,
    candidates,
    importedCount: candidates.length,
    skippedCount,
  };
}
