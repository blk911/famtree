// lib/operators/sources/sola/run-sola-harvest.ts

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { buildSolaCandidateKey, extractProfileSlug } from "./candidate-key";
import { dedupeSolaListings } from "./dedupe-listings";
import {
  createSolaProfileBrowser,
  enrichSolaProfile,
  type PlaywrightPage,
} from "./enrich-sola-profile";
import {
  applyGroupingMetadata,
  mapListingToResolverCandidate,
} from "./map-resolver-candidate";
import { mergeProfileEnrichment } from "./merge-profile-enrichment";
import {
  discoverSolaApiEndpoint,
  scrapeSolaLocation,
} from "./scrape-sola-location";
import type {
  SolaEvidenceRecord,
  SolaHarvestArtifact,
  SolaHarvestOptions,
  SolaOperatorCandidatesArtifact,
  SolaProfileEnrichment,
  SolaProfileEnrichmentArtifact,
  SolaRawListing,
  SolaResolverCandidate,
  SolaSlugHarvestResult,
} from "./types";
import { SOLA_SOURCE_PROVIDER, SOLA_SOURCE_TYPE } from "./types";

export { buildSolaCandidateKey, extractProfileSlug };

const SOLA_DATA_DIR = path.join(process.cwd(), "runtime-data", "sola");

export const HARVEST_ARTIFACT_PATH = path.join(
  SOLA_DATA_DIR,
  "sola-harvest.generated.json",
);

export const CANDIDATES_ARTIFACT_PATH = path.join(
  SOLA_DATA_DIR,
  "sola-operator-candidates.generated.json",
);

export const PROFILE_ENRICHMENT_ARTIFACT_PATH = path.join(
  SOLA_DATA_DIR,
  "sola-profile-enrichment.generated.json",
);

const BASE_CONFIDENCE = 70;
const PROFILE_CONFIDENCE = 82;
const API_DISCOVERY_CONFIDENCE = 85;

function evidenceConfidence(
  listing: SolaRawListing,
  apiEndpoint: string | null,
): number {
  if (apiEndpoint && listing.normalizedProfileUrl) return API_DISCOVERY_CONFIDENCE;
  if (listing.normalizedProfileUrl) return PROFILE_CONFIDENCE;
  return BASE_CONFIDENCE;
}

function listingToEvidence(
  listing: SolaRawListing,
  candidate: SolaResolverCandidate,
  slug: string,
  sourceUrl: string,
  apiEndpoint: string | null,
): SolaEvidenceRecord {
  const profileUrl = candidate.profileUrl;
  return {
    candidateKey: candidate.candidateKey,
    sourceProvider: SOLA_SOURCE_PROVIDER,
    sourceType: SOLA_SOURCE_TYPE,
    sourceUrl,
    evidenceUrl: profileUrl ?? sourceUrl,
    profileUrl,
    parentContainerId: listing.parentContainerId,
    parentContainerSlug: slug,
    confidence: evidenceConfidence(listing, apiEndpoint),
    capturedAt: new Date().toISOString(),
    notes: listing.suiteLabel ?? listing.suite,
  };
}

export function printCollisionDiagnostic(candidates: SolaResolverCandidate[]): void {
  const totalCandidates = candidates.length;
  const keyCounts = new Map<string, number>();

  for (const candidate of candidates) {
    keyCounts.set(
      candidate.candidateKey,
      (keyCounts.get(candidate.candidateKey) ?? 0) + 1,
    );
  }

  const uniqueCandidateKeys = keyCounts.size;
  const collisionEntries = Array.from(keyCounts.entries()).filter(([, count]) => count > 1);

  console.log(
    `totalCandidates=${totalCandidates} uniqueCandidateKeys=${uniqueCandidateKeys} collisions=${collisionEntries.length}`,
  );

  for (const [key, count] of collisionEntries) {
    console.log(`  collision: ${key} (${count}x)`);
  }
}

function printSlugSummary(result: SolaSlugHarvestResult): void {
  const parts = [
    `slug=${result.slug}`,
    `rawListings=${result.rawListings}`,
    `dedupedListings=${result.dedupedListings}`,
    `candidatesCreated=${result.candidatesCreated}`,
  ];
  if (result.profilesEnriched !== undefined) {
    parts.push(`profilesEnriched=${result.profilesEnriched}`);
  }
  if (result.profileEnrichmentFailed !== undefined) {
    parts.push(`profileEnrichmentFailed=${result.profileEnrichmentFailed}`);
  }
  parts.push(result.error ? `errors=${result.error}` : "errors=none");
  console.log(parts.join(" | "));
}

async function readCandidatesArtifact(): Promise<SolaResolverCandidate[]> {
  try {
    const raw = await readFile(CANDIDATES_ARTIFACT_PATH, "utf8");
    const parsed = JSON.parse(raw) as SolaOperatorCandidatesArtifact;
    return parsed.candidates ?? [];
  } catch {
    return [];
  }
}

async function writeCandidatesArtifact(
  newCandidates: SolaResolverCandidate[],
  harvestedSlugs: string[],
): Promise<SolaOperatorCandidatesArtifact> {
  const existing = await readCandidatesArtifact();
  const slugSet = new Set(harvestedSlugs.map((slug) => slug.trim().toLowerCase()));
  const retained = existing.filter(
    (candidate) => !slugSet.has(candidate.parentContainerSlug),
  );

  const byKey = new Map<string, SolaResolverCandidate>();
  for (const candidate of retained) {
    byKey.set(candidate.candidateKey, candidate);
  }
  for (const candidate of newCandidates) {
    byKey.set(candidate.candidateKey, candidate);
  }

  const candidates = Array.from(byKey.values());
  const artifact: SolaOperatorCandidatesArtifact = {
    generatedAt: new Date().toISOString(),
    sourceProvider: SOLA_SOURCE_PROVIDER,
    sourceType: SOLA_SOURCE_TYPE,
    candidateCount: candidates.length,
    candidates,
  };

  await mkdir(SOLA_DATA_DIR, { recursive: true });
  await writeFile(
    CANDIDATES_ARTIFACT_PATH,
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );

  return artifact;
}

async function readProfileEnrichmentArtifact(): Promise<SolaProfileEnrichment[]> {
  try {
    const raw = await readFile(PROFILE_ENRICHMENT_ARTIFACT_PATH, "utf8");
    const parsed = JSON.parse(raw) as SolaProfileEnrichmentArtifact;
    return parsed.profiles ?? [];
  } catch {
    return [];
  }
}

async function writeProfileEnrichmentArtifact(
  newProfiles: SolaProfileEnrichment[],
  harvestedProfileUrls: Set<string>,
): Promise<SolaProfileEnrichmentArtifact> {
  const existing = await readProfileEnrichmentArtifact();

  const retained = existing.filter(
    (profile) => !harvestedProfileUrls.has(profile.profileUrl.toLowerCase()),
  );

  const byUrl = new Map<string, SolaProfileEnrichment>();
  for (const profile of retained) {
    byUrl.set(profile.profileUrl.toLowerCase(), profile);
  }
  for (const profile of newProfiles) {
    byUrl.set(profile.profileUrl.toLowerCase(), profile);
  }

  const profiles = Array.from(byUrl.values());
  const artifact: SolaProfileEnrichmentArtifact = {
    generatedAt: new Date().toISOString(),
    sourceProvider: SOLA_SOURCE_PROVIDER,
    profileCount: profiles.length,
    profiles,
  };

  await mkdir(SOLA_DATA_DIR, { recursive: true });
  await writeFile(
    PROFILE_ENRICHMENT_ARTIFACT_PATH,
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );

  return artifact;
}

async function enrichCandidates(
  candidates: SolaResolverCandidate[],
  options: SolaHarvestOptions,
): Promise<{
  candidates: SolaResolverCandidate[];
  profiles: SolaProfileEnrichment[];
  enriched: number;
  failed: number;
}> {
  const limit = options.profileLimit ?? candidates.length;
  const targets = candidates
    .filter((candidate) => candidate.profileUrl)
    .slice(0, limit);

  const browserSession = await createSolaProfileBrowser();
  if (!browserSession) {
    console.log("[sola-harvest] profile enrichment skipped: Playwright unavailable");
    return {
      candidates: candidates.map((candidate) => ({
        ...candidate,
        enrichmentStatus: candidate.profileUrl ? "failed" : ("skipped" as const),
      })),
      profiles: [],
      enriched: 0,
      failed: targets.length,
    };
  }

  const profiles: SolaProfileEnrichment[] = [];
  let enriched = 0;
  let failed = 0;
  const enrichedByKey = new Map<string, SolaResolverCandidate>();

  for (const candidate of candidates) {
    if (!candidate.profileUrl) {
      enrichedByKey.set(candidate.candidateKey, {
        ...candidate,
        enrichmentStatus: "skipped",
      });
      continue;
    }
    if (!targets.some((target) => target.candidateKey === candidate.candidateKey)) {
      enrichedByKey.set(candidate.candidateKey, {
        ...candidate,
        enrichmentStatus: "skipped",
      });
      continue;
    }
    enrichedByKey.set(candidate.candidateKey, candidate);
  }

  try {
    for (const candidate of targets) {
      const profileUrl = candidate.profileUrl!;
      const page = (await browserSession.browser.newPage()) as PlaywrightPage;
      try {
        console.log(`[sola-harvest] enriching ${profileUrl}`);
        const enrichment = await enrichSolaProfile(profileUrl, { page });
        profiles.push(enrichment);

        if (enrichment.error) {
          failed += 1;
          enrichedByKey.set(candidate.candidateKey, {
            ...candidate,
            enrichmentStatus: "failed",
            enrichmentFetchedAt: enrichment.fetchedAt,
          });
        } else {
          enriched += 1;
          enrichedByKey.set(
            candidate.candidateKey,
            mergeProfileEnrichment(candidate, enrichment),
          );
        }
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        profiles.push({
          profileUrl,
          phoneLinks: [],
          emailLinks: [],
          websiteLinks: [],
          instagramLinks: [],
          facebookLinks: [],
          bookingLinks: [],
          services: [],
          imageUrls: [],
          fetchedAt: new Date().toISOString(),
          apiHitsCount: 0,
          error: message,
        });
        enrichedByKey.set(candidate.candidateKey, {
          ...candidate,
          enrichmentStatus: "failed",
          enrichmentFetchedAt: new Date().toISOString(),
        });
      } finally {
        await page.close().catch(() => undefined);
      }
    }
  } finally {
    await browserSession.browser.close().catch(() => undefined);
  }

  return {
    candidates: candidates.map(
      (candidate) => enrichedByKey.get(candidate.candidateKey) ?? candidate,
    ),
    profiles,
    enriched,
    failed,
  };
}

async function harvestSlug(
  slug: string,
  options: SolaHarvestOptions = {},
): Promise<SolaSlugHarvestResult> {
  const clean = slug.trim().toLowerCase();
  try {
    const scrape = await scrapeSolaLocation(clean);
    if (scrape.error && scrape.listings.length === 0) {
      return {
        slug: clean,
        ok: false,
        rawListings: 0,
        dedupedListings: 0,
        candidatesCreated: 0,
        listingsFound: 0,
        candidates: [],
        evidence: [],
        scrape,
        error: scrape.error,
      };
    }

    const rawListings = scrape.listings.length;
    const deduped = dedupeSolaListings(scrape.listings);
    const apiEndpoint = discoverSolaApiEndpoint(scrape.apiHits);

    let candidates = applyGroupingMetadata(
      deduped.map((listing) => mapListingToResolverCandidate(listing, clean)),
    );
    printCollisionDiagnostic(candidates);

    let profilesEnriched = 0;
    let profileEnrichmentFailed = 0;
    let profileEnrichments: SolaProfileEnrichment[] = [];

    if (options.enrichProfiles) {
      const enrichmentResult = await enrichCandidates(candidates, options);
      candidates = enrichmentResult.candidates;
      profileEnrichments = enrichmentResult.profiles;
      profilesEnriched = enrichmentResult.enriched;
      profileEnrichmentFailed = enrichmentResult.failed;
      console.log(
        `[sola-harvest] enrichment: enriched=${profilesEnriched} failed=${profileEnrichmentFailed}`,
      );
    }

    const evidence = deduped.map((listing, index) =>
      listingToEvidence(
        listing,
        candidates.find((row) => row.candidateKey === listing.candidateKey) ?? candidates[index],
        clean,
        scrape.sourceUrl,
        apiEndpoint,
      ),
    );

    return {
      slug: clean,
      ok: true,
      rawListings,
      dedupedListings: deduped.length,
      candidatesCreated: candidates.length,
      listingsFound: deduped.length,
      candidates,
      evidence,
      scrape,
      profilesEnriched,
      profileEnrichmentFailed,
      profileEnrichments,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      slug: clean,
      ok: false,
      rawListings: 0,
      dedupedListings: 0,
      candidatesCreated: 0,
      listingsFound: 0,
      candidates: [],
      evidence: [],
      error: message,
    };
  }
}

export async function runSolaHarvest(
  slugs: string | string[],
  options: SolaHarvestOptions = {},
): Promise<SolaHarvestArtifact> {
  const slugList = (Array.isArray(slugs) ? slugs : [slugs])
    .map((slug) => slug.trim().toLowerCase())
    .filter(Boolean);

  const results: SolaSlugHarvestResult[] = [];
  const errors: Array<{ slug: string; error: string }> = [];
  const allCandidates: SolaResolverCandidate[] = [];
  const allProfileEnrichments: SolaProfileEnrichment[] = [];
  const harvestedProfileUrls = new Set<string>();

  for (const slug of slugList) {
    const result = await harvestSlug(slug, options);
    results.push(result);
    printSlugSummary(result);

    if (!result.ok && result.error) {
      errors.push({ slug, error: result.error });
    } else {
      allCandidates.push(...result.candidates);
      if (result.profileEnrichments?.length) {
        allProfileEnrichments.push(...result.profileEnrichments);
        for (const profile of result.profileEnrichments) {
          harvestedProfileUrls.add(profile.profileUrl.toLowerCase());
        }
      }
    }
  }

  const artifact: SolaHarvestArtifact = {
    harvestedAt: new Date().toISOString(),
    slugs: slugList,
    results,
    errors,
  };

  await mkdir(SOLA_DATA_DIR, { recursive: true });
  await writeFile(HARVEST_ARTIFACT_PATH, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

  const candidatesArtifact = await writeCandidatesArtifact(allCandidates, slugList);
  console.log(
    `[sola-harvest] wrote ${candidatesArtifact.candidateCount} candidates -> ${CANDIDATES_ARTIFACT_PATH}`,
  );

  if (options.enrichProfiles && allProfileEnrichments.length > 0) {
    const profileArtifact = await writeProfileEnrichmentArtifact(
      allProfileEnrichments,
      harvestedProfileUrls,
    );
    const withPhones = profileArtifact.profiles.filter((p) => p.phoneLinks.length > 0).length;
    const withSocial = profileArtifact.profiles.filter(
      (p) => p.instagramLinks.length > 0 || p.facebookLinks.length > 0,
    ).length;
    const withBooking = profileArtifact.profiles.filter((p) => p.bookingLinks.length > 0).length;
    const withApi = profileArtifact.profiles.filter((p) => p.likelyProfileApiEndpoint).length;
    console.log(
      `[sola-harvest] wrote ${profileArtifact.profileCount} profiles -> ${PROFILE_ENRICHMENT_ARTIFACT_PATH}`,
    );
    console.log(
      `[sola-harvest] enrichment evidence: phones=${withPhones} social=${withSocial} booking=${withBooking} profileApi=${withApi}`,
    );
  }

  return artifact;
}
