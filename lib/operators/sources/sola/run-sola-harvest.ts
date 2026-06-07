// lib/operators/sources/sola/run-sola-harvest.ts

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { buildSolaCandidateKey, extractProfileSlug } from "./candidate-key";
import { dedupeSolaListings } from "./dedupe-listings";
import {
  readProfileApiEndpointCache,
  writeProfileApiEndpointCache,
} from "./fetch-sola-profile-api";
import { enrichSolaProfile } from "./enrich-sola-profile";
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
  SolaEnrichmentMethod,
  SolaEnrichmentTimingSummary,
  SolaEvidenceRecord,
  SolaHarvestArtifact,
  SolaHarvestOptions,
  SolaHealthArtifact,
  SolaOperatorCandidatesArtifact,
  SolaProfileEnrichment,
  SolaProfileEnrichmentArtifact,
  SolaRawListing,
  SolaRecoverySource,
  SolaResolverCandidate,
  SolaSlugHealth,
  SolaSlugHarvestResult,
  SolaSlugRecoveryMetrics,
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

export const HEALTH_ARTIFACT_PATH = path.join(
  SOLA_DATA_DIR,
  "sola-health.generated.json",
);

const DEGRADED_LISTING_RATIO = 0.25;

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
  if (result.recoverySource) {
    parts.push(`recoverySource=${result.recoverySource}`);
  }
  if (result.profilesEnriched !== undefined) {
    parts.push(`profilesEnriched=${result.profilesEnriched}`);
  }
  if (result.profileEnrichmentFailed !== undefined) {
    parts.push(`profileEnrichmentFailed=${result.profileEnrichmentFailed}`);
  }
  parts.push(result.error ? `errors=${result.error}` : "errors=none");
  console.log(parts.join(" | "));
}

function printRecoveryMetrics(metrics: SolaSlugRecoveryMetrics): void {
  console.log(JSON.stringify(metrics));
}

function printArtifactRecoveryWarning(
  liveListings: number,
  artifactListings: number,
  reuseArtifacts: boolean,
): void {
  console.warn("WARNING:");
  if (reuseArtifacts) {
    console.warn("Sola scrape skipped (--reuse-artifacts).");
  } else {
    console.warn("Sola scrape degraded.");
  }
  console.warn("Using artifact recovery.");
  console.warn(`Live: ${liveListings}`);
  console.warn(`Artifact: ${artifactListings}`);
}

function isScrapeDegraded(liveCount: number, previousCount: number): boolean {
  if (liveCount === 0) return true;
  if (previousCount <= 0) return false;
  return liveCount < previousCount * DEGRADED_LISTING_RATIO;
}

function filterCandidatesForSlug(
  candidates: SolaResolverCandidate[],
  slug: string,
): SolaResolverCandidate[] {
  const clean = slug.trim().toLowerCase();
  return candidates.filter((candidate) => candidate.parentContainerSlug === clean);
}

function mergeCandidates(
  live: SolaResolverCandidate[],
  artifact: SolaResolverCandidate[],
): SolaResolverCandidate[] {
  const byKey = new Map<string, SolaResolverCandidate>();
  for (const candidate of artifact) {
    byKey.set(candidate.candidateKey, candidate);
  }
  for (const candidate of live) {
    byKey.set(candidate.candidateKey, candidate);
  }
  return Array.from(byKey.values());
}

function defaultSlugHealth(): SolaSlugHealth {
  return {
    lastListingCount: 0,
    lastEnrichmentCount: 0,
    scrapeFailures: 0,
    scrapeDegradedEvents: 0,
  };
}

async function readHealthArtifact(): Promise<SolaHealthArtifact> {
  try {
    const raw = await readFile(HEALTH_ARTIFACT_PATH, "utf8");
    return JSON.parse(raw) as SolaHealthArtifact;
  } catch {
    return { generatedAt: new Date().toISOString(), slugs: {} };
  }
}

async function writeHealthArtifact(artifact: SolaHealthArtifact): Promise<void> {
  await mkdir(SOLA_DATA_DIR, { recursive: true });
  await writeFile(
    HEALTH_ARTIFACT_PATH,
    `${JSON.stringify({ ...artifact, generatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
}

async function getPreviousListingCount(slug: string): Promise<number> {
  const health = await readHealthArtifact();
  const fromHealth = health.slugs[slug]?.lastListingCount;
  if (fromHealth && fromHealth > 0) return fromHealth;

  try {
    const raw = await readFile(HARVEST_ARTIFACT_PATH, "utf8");
    const harvest = JSON.parse(raw) as SolaHarvestArtifact;
    const result = harvest.results?.find((row) => row.slug === slug);
    if (result?.dedupedListings && result.dedupedListings > 0) {
      return result.dedupedListings;
    }
  } catch {
    // no prior harvest artifact
  }

  return 0;
}

async function updateSlugHealth(
  slug: string,
  patch: Partial<SolaSlugHealth>,
): Promise<void> {
  const health = await readHealthArtifact();
  const current = health.slugs[slug] ?? defaultSlugHealth();
  health.slugs[slug] = { ...current, ...patch };
  await writeHealthArtifact(health);
}

async function recordScrapeFailure(slug: string): Promise<void> {
  const health = await readHealthArtifact();
  const current = health.slugs[slug] ?? defaultSlugHealth();
  health.slugs[slug] = {
    ...current,
    scrapeFailures: current.scrapeFailures + 1,
  };
  await writeHealthArtifact(health);
}

async function recordScrapeDegraded(slug: string): Promise<void> {
  const health = await readHealthArtifact();
  const current = health.slugs[slug] ?? defaultSlugHealth();
  health.slugs[slug] = {
    ...current,
    scrapeDegradedEvents: current.scrapeDegradedEvents + 1,
  };
  await writeHealthArtifact(health);
}

async function recordSuccessfulScrape(slug: string, listingCount: number): Promise<void> {
  await updateSlugHealth(slug, {
    lastSuccessfulScrape: new Date().toISOString(),
    lastListingCount: listingCount,
  });
}

async function recordEnrichmentCount(slug: string, enrichedProfiles: number): Promise<void> {
  await updateSlugHealth(slug, { lastEnrichmentCount: enrichedProfiles });
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

function printEnrichmentTiming(summary: SolaEnrichmentTimingSummary): void {
  console.log(
    [
      `profilesAttempted=${summary.profilesAttempted}`,
      `apiEnriched=${summary.apiEnriched}`,
      `playwrightEnriched=${summary.playwrightEnriched}`,
      `mixedEnriched=${summary.mixedEnriched}`,
      `failed=${summary.failed}`,
      `skipped=${summary.skipped}`,
      `durationMs=${summary.durationMs}`,
    ].join(" | "),
  );
}

function countByMethod(
  profiles: SolaProfileEnrichment[],
): Pick<SolaEnrichmentTimingSummary, "apiEnriched" | "playwrightEnriched" | "mixedEnriched" | "failed"> {
  let apiEnriched = 0;
  let playwrightEnriched = 0;
  let mixedEnriched = 0;
  let failed = 0;

  for (const profile of profiles) {
    const method: SolaEnrichmentMethod = profile.enrichmentMethod ?? (profile.error ? "failed" : "api");
    if (method === "api") apiEnriched += 1;
    else if (method === "playwright") playwrightEnriched += 1;
    else if (method === "mixed") mixedEnriched += 1;
    else failed += 1;
  }

  return { apiEnriched, playwrightEnriched, mixedEnriched, failed };
}

async function enrichCandidates(
  candidates: SolaResolverCandidate[],
  options: SolaHarvestOptions,
): Promise<{
  candidates: SolaResolverCandidate[];
  profiles: SolaProfileEnrichment[];
  enriched: number;
  failed: number;
  timing: SolaEnrichmentTimingSummary;
}> {
  const startedAt = Date.now();
  const limit = options.profileLimit ?? candidates.length;
  const targets = candidates
    .filter((candidate) => candidate.profileUrl)
    .slice(0, limit);

  const endpointCache = await readProfileApiEndpointCache();
  const endpointUpdates: Record<string, string> = {};

  const profiles: SolaProfileEnrichment[] = [];
  let enriched = 0;
  let failed = 0;
  let skipped = 0;
  const enrichedByKey = new Map<string, SolaResolverCandidate>();

  for (const candidate of candidates) {
    if (!candidate.profileUrl) {
      enrichedByKey.set(candidate.candidateKey, {
        ...candidate,
        enrichmentStatus: "skipped",
      });
      skipped += 1;
      continue;
    }
    if (!targets.some((target) => target.candidateKey === candidate.candidateKey)) {
      enrichedByKey.set(candidate.candidateKey, {
        ...candidate,
        enrichmentStatus: "skipped",
      });
      skipped += 1;
      continue;
    }
    enrichedByKey.set(candidate.candidateKey, candidate);
  }

  for (const candidate of targets) {
      const profileUrl = candidate.profileUrl!;
      const cacheKey = profileUrl.toLowerCase();
      const knownEndpoint = endpointCache[cacheKey] ?? endpointCache[profileUrl];

      try {
        console.log(
          `[sola-harvest] enriching ${profileUrl}${options.apiOnly ? " (api-only)" : ""}`,
        );
        const enrichment = await enrichSolaProfile(profileUrl, {
          knownEndpoint,
          apiOnly: options.apiOnly,
        });
        profiles.push(enrichment);

        const discoveredEndpoint =
          enrichment.apiEndpoint ?? enrichment.likelyProfileApiEndpoint;
        if (discoveredEndpoint) {
          endpointUpdates[cacheKey] = discoveredEndpoint;
        }

        if (enrichment.error) {
          failed += 1;
          enrichedByKey.set(candidate.candidateKey, {
            ...candidate,
            enrichmentStatus:
              enrichment.error === "skipped_api_unavailable"
                ? "skipped_api_unavailable"
                : "failed",
            enrichmentMethod: enrichment.enrichmentMethod ?? "failed",
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
          enrichmentMethod: "failed",
          error: message,
        });
        enrichedByKey.set(candidate.candidateKey, {
          ...candidate,
          enrichmentStatus: "failed",
          enrichmentMethod: "failed",
          enrichmentFetchedAt: new Date().toISOString(),
        });
      }
    }

  if (Object.keys(endpointUpdates).length > 0) {
    await writeProfileApiEndpointCache(endpointUpdates);
  }

  const methodCounts = countByMethod(profiles);
  const timing: SolaEnrichmentTimingSummary = {
    profilesAttempted: targets.length,
    ...methodCounts,
    skipped,
    durationMs: Date.now() - startedAt,
  };
  printEnrichmentTiming(timing);

  return {
    candidates: candidates.map(
      (candidate) => enrichedByKey.get(candidate.candidateKey) ?? candidate,
    ),
    profiles,
    enriched,
    failed,
    timing,
  };
}

function candidateToEvidence(
  candidate: SolaResolverCandidate,
  slug: string,
  sourceUrl: string,
): SolaEvidenceRecord {
  const profileUrl = candidate.profileUrl;
  return {
    candidateKey: candidate.candidateKey,
    sourceProvider: SOLA_SOURCE_PROVIDER,
    sourceType: SOLA_SOURCE_TYPE,
    sourceUrl,
    evidenceUrl: profileUrl ?? sourceUrl,
    profileUrl,
    parentContainerId: candidate.parentContainerId,
    parentContainerSlug: slug,
    confidence: profileUrl ? PROFILE_CONFIDENCE : BASE_CONFIDENCE,
    capturedAt: new Date().toISOString(),
    notes: candidate.suiteNumber ? `Studio ${candidate.suiteNumber}` : undefined,
  };
}

async function harvestSlug(
  slug: string,
  options: SolaHarvestOptions = {},
): Promise<SolaSlugHarvestResult> {
  const clean = slug.trim().toLowerCase();
  const artifactCandidates = filterCandidatesForSlug(await readCandidatesArtifact(), clean);
  const artifactListings = artifactCandidates.length;
  const previousListingCount = await getPreviousListingCount(clean);

  let liveListings = 0;
  let recoverySource: SolaRecoverySource = "live";
  let scrapeDegraded = false;
  let candidates: SolaResolverCandidate[] = [];
  let evidence: SolaEvidenceRecord[] = [];
  let scrape: Awaited<ReturnType<typeof scrapeSolaLocation>> | undefined;
  let rawListings = 0;
  let dedupedListings = 0;
  const defaultSourceUrl = `https://book.solasalonstudios.com/${clean}/location`;

  try {
    if (options.reuseArtifacts) {
      if (artifactListings === 0) {
        await recordScrapeFailure(clean);
        return {
          slug: clean,
          ok: false,
          rawListings: 0,
          dedupedListings: 0,
          candidatesCreated: 0,
          listingsFound: 0,
          candidates: [],
          evidence: [],
          recoverySource: "artifact",
          error: `No artifact candidates for slug "${clean}"`,
        };
      }

      candidates = artifactCandidates;
      recoverySource = "artifact";
      printArtifactRecoveryWarning(0, artifactListings, true);
      evidence = candidates.map((candidate) =>
        candidateToEvidence(candidate, clean, candidate.sourceUrl || defaultSourceUrl),
      );
    } else {
      scrape = await scrapeSolaLocation(clean);
      const sourceUrl = scrape.sourceUrl;
      rawListings = scrape.listings.length;
      const deduped = dedupeSolaListings(scrape.listings);
      dedupedListings = deduped.length;
      liveListings = dedupedListings;
      const apiEndpoint = discoverSolaApiEndpoint(scrape.apiHits);
      const liveCandidates = applyGroupingMetadata(
        deduped.map((listing) => mapListingToResolverCandidate(listing, clean)),
      );

      if (isScrapeDegraded(liveListings, previousListingCount)) {
        scrapeDegraded = true;
        await recordScrapeDegraded(clean);

        if (liveListings === 0) {
          if (artifactListings === 0) {
            await recordScrapeFailure(clean);
            return {
              slug: clean,
              ok: false,
              rawListings,
              dedupedListings,
              candidatesCreated: 0,
              listingsFound: 0,
              candidates: [],
              evidence: [],
              scrape,
              recoverySource: "artifact",
              scrapeDegraded: true,
              error: scrape.error ?? "Live scrape returned 0 listings and no artifact candidates",
            };
          }

          candidates = artifactCandidates;
          recoverySource = "artifact";
          printArtifactRecoveryWarning(0, artifactListings, false);
          evidence = candidates.map((candidate) =>
            candidateToEvidence(candidate, clean, candidate.sourceUrl || defaultSourceUrl),
          );
        } else {
          candidates = mergeCandidates(liveCandidates, artifactCandidates);
          recoverySource = "mixed";
          printArtifactRecoveryWarning(liveListings, artifactListings, false);
          evidence = deduped.map((listing, index) =>
            listingToEvidence(
              listing,
              candidates.find((row) => row.candidateKey === listing.candidateKey) ??
                liveCandidates[index],
              clean,
              sourceUrl,
              apiEndpoint,
            ),
          );
        }
      } else {
        candidates = liveCandidates;
        recoverySource = "live";
        await recordSuccessfulScrape(clean, liveListings);
        evidence = deduped.map((listing, index) =>
          listingToEvidence(
            listing,
            candidates.find((row) => row.candidateKey === listing.candidateKey) ??
              liveCandidates[index],
            clean,
            sourceUrl,
            apiEndpoint,
          ),
        );
      }
    }

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
      await recordEnrichmentCount(clean, profilesEnriched);
      console.log(
        `[sola-harvest] enrichment: enriched=${profilesEnriched} failed=${profileEnrichmentFailed} apiOnly=${options.apiOnly ? "yes" : "no"}`,
      );
    }

    const recoveryMetrics: SolaSlugRecoveryMetrics = {
      slug: clean,
      liveListings,
      artifactListings,
      candidatesUsed: candidates.length,
      recoverySource,
      enrichedProfiles: profilesEnriched,
    };
    printRecoveryMetrics(recoveryMetrics);

    return {
      slug: clean,
      ok: true,
      rawListings,
      dedupedListings,
      candidatesCreated: candidates.length,
      listingsFound: recoverySource === "artifact" ? artifactListings : dedupedListings,
      candidates,
      evidence,
      scrape,
      profilesEnriched,
      profileEnrichmentFailed,
      profileEnrichments,
      recoverySource,
      scrapeDegraded,
      recoveryMetrics,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordScrapeFailure(clean);
    return {
      slug: clean,
      ok: false,
      rawListings,
      dedupedListings,
      candidatesCreated: 0,
      listingsFound: 0,
      candidates: [],
      evidence: [],
      scrape,
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
