// lib/operators/sources/sola/run-sola-harvest.ts

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { buildSolaCandidateKey, extractProfileSlug } from "./candidate-key";
import { dedupeSolaListings } from "./dedupe-listings";
import {
  applyGroupingMetadata,
  mapListingToResolverCandidate,
} from "./map-resolver-candidate";
import {
  discoverSolaApiEndpoint,
  scrapeSolaLocation,
} from "./scrape-sola-location";
import type {
  SolaEvidenceRecord,
  SolaHarvestArtifact,
  SolaOperatorCandidatesArtifact,
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
  console.log(
    [
      `slug=${result.slug}`,
      `rawListings=${result.rawListings}`,
      `dedupedListings=${result.dedupedListings}`,
      `candidatesCreated=${result.candidatesCreated}`,
      result.error ? `errors=${result.error}` : "errors=none",
    ].join(" | "),
  );
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

async function harvestSlug(slug: string): Promise<SolaSlugHarvestResult> {
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

    const candidates = applyGroupingMetadata(
      deduped.map((listing) => mapListingToResolverCandidate(listing, clean)),
    );
    printCollisionDiagnostic(candidates);

    const evidence = deduped.map((listing, index) =>
      listingToEvidence(
        listing,
        candidates[index],
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
): Promise<SolaHarvestArtifact> {
  const slugList = (Array.isArray(slugs) ? slugs : [slugs])
    .map((slug) => slug.trim().toLowerCase())
    .filter(Boolean);

  const results: SolaSlugHarvestResult[] = [];
  const errors: Array<{ slug: string; error: string }> = [];
  const allCandidates: SolaResolverCandidate[] = [];

  for (const slug of slugList) {
    const result = await harvestSlug(slug);
    results.push(result);
    printSlugSummary(result);

    if (!result.ok && result.error) {
      errors.push({ slug, error: result.error });
    } else {
      allCandidates.push(...result.candidates);
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

  return artifact;
}
