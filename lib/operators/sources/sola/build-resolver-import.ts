// lib/operators/sources/sola/build-resolver-import.ts

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { getSolaDataDir } from "./paths";
import { CANDIDATES_ARTIFACT_PATH } from "./run-sola-harvest";
import type {
  SolaCategoryBucket,
  SolaOperatorCandidatesArtifact,
  SolaResolverCandidate,
  SolaResolverImportArtifact,
  SolaResolverImportRecord,
  SolaResolverImportSlugSummary,
  SolaResolverImportSummary,
  SolaResolverImportTopCandidate,
  SolaResolverRecommendedAction,
  SolaResolverVerificationStatus,
} from "./types";
import { SOLA_PARENT_CONTAINER_BRAND, SOLA_SOURCE_PROVIDER, SOLA_SOURCE_TYPE } from "./types";

export const RESOLVER_IMPORT_ARTIFACT_PATH = path.join(
  getSolaDataDir(),
  "sola-resolver-import.generated.json",
);

const TOP_CANDIDATE_COUNT = 10;

const CATEGORY_BUCKET_ORDER: SolaCategoryBucket[] = [
  "barber",
  "nails",
  "lashes",
  "skin",
  "wax",
  "massage",
  "hair",
  "other",
];

const BUCKET_PATTERNS: Array<{ bucket: SolaCategoryBucket; pattern: RegExp }> = [
  { bucket: "barber", pattern: /\bbarber\b/i },
  { bucket: "nails", pattern: /\bnail/i },
  { bucket: "lashes", pattern: /\b(lash|brow)\b/i },
  { bucket: "skin", pattern: /\b(skin|facial|electrolysis)\b/i },
  { bucket: "wax", pattern: /\bwax/i },
  { bucket: "massage", pattern: /\b(massage|bodywork)\b/i },
  { bucket: "hair", pattern: /\b(hair|braid|colorist|stylist)\b/i },
];

const IGNORED_SERVICE_TOKENS = new Set(["portfolio", "other", "others"]);

type EnrichedSolaCandidate = SolaResolverCandidate & { displayName?: string };

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function clampScore(value: number, max = 100): number {
  return Math.max(0, Math.min(max, Math.round(value)));
}

function resolveDisplayName(candidate: EnrichedSolaCandidate): string {
  return candidate.displayName?.trim() || candidate.operatorName;
}

function hasPhone(candidate: SolaResolverCandidate): boolean {
  if (candidate.phones?.some((p) => p.trim().length >= 10)) return true;
  return candidate.phoneLinks.some((link) => {
    const digits = link.replace(/\D/g, "");
    return digits.length >= 10;
  });
}

function isBookingLink(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || trimmed.length < 12 || trimmed === "https://www.") return false;
  if (trimmed.startsWith("tel:") || trimmed.startsWith("mailto:")) return false;

  const lower = trimmed.toLowerCase();
  const host = hostOf(trimmed);

  if (host === "book.solasalonstudios.com") {
    return lower.includes("/pro") && !lower.includes("/location");
  }

  if (host === "connect.vagaro.com" || host === "api.vagaro.com") return false;
  if (host.endsWith("vagaro.com")) {
    if (lower.includes("/api") || lower.includes("/new")) return false;
    return true;
  }

  if (host === "book.vagaro.com") return true;
  return false;
}

function hasBookingLink(candidate: SolaResolverCandidate): boolean {
  return candidate.bookingLinks.some(isBookingLink);
}

function isCdnAssetUrl(url: string): boolean {
  const host = hostOf(url);
  if (!host) return true;
  return (
    host.includes("rackcdn.com") ||
    host.includes("cloudfront.net") ||
    host.includes("ssl.cf2")
  );
}

function hasExternalWebsite(candidate: SolaResolverCandidate): boolean {
  const urls = [
    candidate.website,
    ...(candidate.externalLinks ?? []),
  ].filter((url): url is string => Boolean(url?.trim()));

  return urls.some((url) => {
    const host = hostOf(url);
    if (!host || isCdnAssetUrl(url)) return false;
    if (host.includes("vagaro")) return false;
    if (host.includes("sola")) return false;
    return true;
  });
}

function hasSocialLink(candidate: SolaResolverCandidate): boolean {
  return candidate.socialLinks.some((link) => {
    const host = hostOf(link);
    if (!host) return false;
    return (
      host.includes("instagram") ||
      host.includes("facebook") ||
      host.includes("tiktok") ||
      host.includes("twitter") ||
      host.includes("x.com") ||
      host.includes("youtube") ||
      host.includes("linkedin")
    );
  });
}

function hasBioOrServices(candidate: SolaResolverCandidate): boolean {
  if (candidate.bio?.trim()) return true;
  const meaningful = [...candidate.services, ...candidate.categories].filter((item) => {
    const token = item.trim().toLowerCase();
    return token.length > 0 && !IGNORED_SERVICE_TOKENS.has(token);
  });
  return meaningful.length > 0;
}

function computeContactabilityScore(candidate: SolaResolverCandidate): number {
  let score = 0;
  if (hasPhone(candidate)) score += 40;
  if (hasBookingLink(candidate)) score += 20;
  if (hasExternalWebsite(candidate)) score += 15;
  if (hasSocialLink(candidate)) score += 15;
  if (hasBioOrServices(candidate)) score += 10;
  return clampScore(score);
}

function hasPersonName(candidate: SolaResolverCandidate): boolean {
  return Boolean(
    candidate.professionalName?.trim() ||
      candidate.contactName?.trim() ||
      candidate.operatorName?.trim(),
  );
}

function hasStudioOrBusinessName(candidate: SolaResolverCandidate): boolean {
  return Boolean(
    candidate.businessName?.trim() ||
      candidate.brandOrStudioName?.trim(),
  );
}

function hasProfileImage(candidate: SolaResolverCandidate): boolean {
  if (candidate.imageUrl?.trim()) return true;
  return Boolean(candidate.profileImages?.some((image) => image.trim()));
}

function computeIdentityScore(candidate: SolaResolverCandidate): number {
  let score = 0;
  if (candidate.profileUrl?.trim()) score += 30;
  if (hasPersonName(candidate)) score += 25;
  if (hasStudioOrBusinessName(candidate)) score += 20;
  if (candidate.suiteNumber?.trim()) score += 15;
  if (hasProfileImage(candidate)) score += 10;
  return clampScore(score);
}

function resolveCategoryBuckets(candidate: SolaResolverCandidate): SolaCategoryBucket[] {
  const haystack = [...candidate.categories, ...candidate.services, candidate.businessName ?? ""]
    .join(" ")
    .trim();

  const buckets = new Set<SolaCategoryBucket>();
  for (const { bucket, pattern } of BUCKET_PATTERNS) {
    if (pattern.test(haystack)) buckets.add(bucket);
  }

  if (buckets.size === 0) buckets.add("other");
  return CATEGORY_BUCKET_ORDER.filter((bucket) => buckets.has(bucket));
}

function primaryCategoryBucket(buckets: SolaCategoryBucket[]): SolaCategoryBucket {
  for (const bucket of CATEGORY_BUCKET_ORDER) {
    if (buckets.includes(bucket)) return bucket;
  }
  return "other";
}

function categoryAcquisitionWeight(buckets: SolaCategoryBucket[]): number {
  let weight = 0;
  for (const bucket of buckets) {
    if (bucket === "nails" || bucket === "lashes" || bucket === "skin" || bucket === "wax") {
      weight = Math.max(weight, 15);
    } else if (bucket === "massage") {
      weight = Math.max(weight, 12);
    } else if (bucket === "hair" || bucket === "barber") {
      weight = Math.max(weight, 8);
    } else if (bucket === "other") {
      weight = Math.max(weight, 3);
    }
  }
  return weight;
}

function computeAcquisitionScore(
  contactabilityScore: number,
  categoryBuckets: SolaCategoryBucket[],
): number {
  return clampScore(contactabilityScore + categoryAcquisitionWeight(categoryBuckets));
}

function resolveVerificationStatus(candidate: SolaResolverCandidate): SolaResolverVerificationStatus {
  const profile = Boolean(candidate.profileUrl?.trim());
  const booking = hasBookingLink(candidate);
  const phone = hasPhone(candidate);

  if (phone && booking && profile) return "live_verified";
  if (profile && booking) return "matched";
  return "discovered";
}

function resolveRecommendedAction(
  verificationStatus: SolaResolverVerificationStatus,
  candidate: SolaResolverCandidate,
): SolaResolverRecommendedAction {
  if (verificationStatus === "live_verified" && hasPhone(candidate)) return "call_or_text";
  if (verificationStatus === "matched") return "booking_profile_review";
  return "needs_manual_validation";
}

function mapResolverImportRecord(candidate: EnrichedSolaCandidate): SolaResolverImportRecord {
  const categoryBuckets = resolveCategoryBuckets(candidate);
  const categoryBucket = primaryCategoryBucket(categoryBuckets);
  const contactabilityScore = computeContactabilityScore(candidate);
  const identityScore = computeIdentityScore(candidate);
  const acquisitionScore = computeAcquisitionScore(contactabilityScore, categoryBuckets);
  const verificationStatus = resolveVerificationStatus(candidate);

  return {
    candidateKey: candidate.candidateKey,
    operatorName: candidate.operatorName,
    displayName: resolveDisplayName(candidate),
    professionalName: candidate.professionalName,
    contactName: candidate.contactName,
    businessName: candidate.businessName,
    brandOrStudioName: candidate.brandOrStudioName,
    slug: candidate.parentContainerSlug,
    locationSlug: candidate.locationSlug,
    locationName: candidate.locationName ?? candidate.parentContainerName,
    suiteNumber: candidate.suiteNumber,
    categories: candidate.categories,
    categoryBuckets,
    categoryBucket,
    phones: candidate.phones ?? [],
    emails: candidate.emails ?? [],
    website: candidate.website,
    externalLinks: candidate.externalLinks,
    socialLinks: candidate.socialLinks,
    bookingLinks: candidate.bookingLinks,
    profileUrl: candidate.profileUrl,
    imageUrl: candidate.imageUrl,
    profileImages: candidate.profileImages,
    bio: candidate.bio,
    parentContainerId: candidate.parentContainerId,
    parentContainerBrand: SOLA_PARENT_CONTAINER_BRAND,
    parentContainerType: "salon_suite",
    containerRelationship: "tenant",
    sourceProvider: SOLA_SOURCE_PROVIDER,
    sourceType: SOLA_SOURCE_TYPE,
    verificationStatus,
    contactabilityScore,
    identityScore,
    acquisitionScore,
    recommendedAction: resolveRecommendedAction(verificationStatus, candidate),
  };
}

export function scoreSolaResolverCandidate(
  candidate: SolaResolverCandidate,
): SolaResolverImportRecord {
  return mapResolverImportRecord(candidate as EnrichedSolaCandidate);
}

function emptySlugSummary(): SolaResolverImportSlugSummary {
  return {
    total: 0,
    liveVerified: 0,
    matched: 0,
    discovered: 0,
    avgAcquisition: 0,
  };
}

function emptyCategoryCounts(): Record<SolaCategoryBucket, number> {
  return {
    hair: 0,
    nails: 0,
    skin: 0,
    lashes: 0,
    barber: 0,
    massage: 0,
    wax: 0,
    other: 0,
  };
}

function toTopCandidate(record: SolaResolverImportRecord): SolaResolverImportTopCandidate {
  return {
    candidateKey: record.candidateKey,
    displayName: record.displayName,
    slug: record.slug,
    categoryBucket: record.categoryBucket,
    acquisitionScore: record.acquisitionScore,
    verificationStatus: record.verificationStatus,
    recommendedAction: record.recommendedAction,
  };
}

export function buildSolaResolverImportSummary(
  records: SolaResolverImportRecord[],
): SolaResolverImportSummary {
  const bySlug: Record<string, SolaResolverImportSlugSummary> = {};
  const byCategory = emptyCategoryCounts();

  let liveVerified = 0;
  let matched = 0;
  let discovered = 0;
  let contactTotal = 0;
  let identityTotal = 0;
  let acquisitionTotal = 0;

  for (const record of records) {
    contactTotal += record.contactabilityScore;
    identityTotal += record.identityScore;
    acquisitionTotal += record.acquisitionScore;
    byCategory[record.categoryBucket] += 1;

    if (record.verificationStatus === "live_verified") liveVerified += 1;
    else if (record.verificationStatus === "matched") matched += 1;
    else discovered += 1;

    const slug = record.slug;
    if (!bySlug[slug]) bySlug[slug] = emptySlugSummary();
    const slugSummary = bySlug[slug];
    slugSummary.total += 1;
    slugSummary.avgAcquisition += record.acquisitionScore;
    if (record.verificationStatus === "live_verified") slugSummary.liveVerified += 1;
    else if (record.verificationStatus === "matched") slugSummary.matched += 1;
    else slugSummary.discovered += 1;
  }

  for (const slug of Object.keys(bySlug)) {
    const summary = bySlug[slug];
    summary.avgAcquisition =
      summary.total > 0 ? Math.round(summary.avgAcquisition / summary.total) : 0;
  }

  const sorted = [...records].sort((a, b) => b.acquisitionScore - a.acquisitionScore);
  const total = records.length;

  return {
    total,
    liveVerified,
    matched,
    discovered,
    avgContactability: total > 0 ? Math.round(contactTotal / total) : 0,
    avgIdentity: total > 0 ? Math.round(identityTotal / total) : 0,
    avgAcquisition: total > 0 ? Math.round(acquisitionTotal / total) : 0,
    bySlug,
    byCategory,
    topAcquisitionCandidates: sorted.slice(0, TOP_CANDIDATE_COUNT).map(toTopCandidate),
  };
}

export function buildSolaResolverImportArtifact(
  candidates: SolaResolverCandidate[],
  sourceArtifact = path.basename(CANDIDATES_ARTIFACT_PATH),
): SolaResolverImportArtifact {
  const records = candidates.map(scoreSolaResolverCandidate);
  records.sort((a, b) => b.acquisitionScore - a.acquisitionScore);

  return {
    generatedAt: new Date().toISOString(),
    sourceProvider: SOLA_SOURCE_PROVIDER,
    sourceType: SOLA_SOURCE_TYPE,
    sourceArtifact,
    recordCount: records.length,
    summary: buildSolaResolverImportSummary(records),
    records,
  };
}

export async function readSolaOperatorCandidatesArtifact(
  inputPath = CANDIDATES_ARTIFACT_PATH,
): Promise<SolaOperatorCandidatesArtifact> {
  const raw = await readFile(inputPath, "utf8");
  return JSON.parse(raw) as SolaOperatorCandidatesArtifact;
}

export async function buildSolaResolverImport(options?: {
  inputPath?: string;
  outputPath?: string;
}): Promise<SolaResolverImportArtifact> {
  const inputPath = options?.inputPath ?? CANDIDATES_ARTIFACT_PATH;
  const outputPath = options?.outputPath ?? RESOLVER_IMPORT_ARTIFACT_PATH;

  const source = await readSolaOperatorCandidatesArtifact(inputPath);
  const artifact = buildSolaResolverImportArtifact(
    source.candidates,
    path.basename(inputPath),
  );

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  return artifact;
}
