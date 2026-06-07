// lib/operators/sources/sola/run-sola-harvest.ts

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import {
  discoverSolaApiEndpoint,
  scrapeSolaLocation,
} from "./scrape-sola-location";
import type {
  SolaEvidenceRecord,
  SolaHarvestArtifact,
  SolaOperatorCandidate,
  SolaRawListing,
  SolaSlugHarvestResult,
} from "./types";
import { SOLA_SOURCE_PROVIDER, SOLA_SOURCE_TYPE } from "./types";

const HARVEST_ARTIFACT_PATH = path.join(
  process.cwd(),
  "runtime-data",
  "sola",
  "sola-harvest.generated.json",
);

const BASE_CONFIDENCE = 70;
const PROFILE_CONFIDENCE = 82;
const API_DISCOVERY_CONFIDENCE = 85;

function listingToCandidate(
  listing: SolaRawListing,
  slug: string,
): SolaOperatorCandidate {
  const profileUrl = listing.normalizedProfileUrl ?? listing.profileUrl;
  return {
    candidateKey: listing.candidateKey,
    parentContainerId: listing.parentContainerId,
    parentContainerSlug: slug,
    sourceProvider: SOLA_SOURCE_PROVIDER,
    sourceType: SOLA_SOURCE_TYPE,
    displayName: listing.displayName,
    professionalName: listing.professionalName,
    businessName: listing.businessName,
    normalizedName: listing.normalizedName,
    normalizedCity: listing.normalizedCity,
    normalizedProfileUrl: listing.normalizedProfileUrl,
    profileUrl,
    bookingUrl: profileUrl,
    imageUrl: listing.imageUrl,
    suiteLabel: listing.suiteLabel,
    categories: listing.categories,
    visibleText: listing.visibleText,
    phoneLinks: listing.phoneLinks,
    socialLinks: listing.socialLinks,
    bookingLinks: listing.bookingLinks,
  };
}

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
  slug: string,
  sourceUrl: string,
  apiEndpoint: string | null,
): SolaEvidenceRecord {
  const profileUrl = listing.normalizedProfileUrl ?? listing.profileUrl;
  return {
    candidateKey: listing.candidateKey,
    sourceProvider: SOLA_SOURCE_PROVIDER,
    sourceType: SOLA_SOURCE_TYPE,
    sourceUrl,
    evidenceUrl: profileUrl ?? sourceUrl,
    profileUrl,
    parentContainerId: listing.parentContainerId,
    parentContainerSlug: slug,
    confidence: evidenceConfidence(listing, apiEndpoint),
    capturedAt: new Date().toISOString(),
    notes: listing.suiteLabel,
  };
}

async function harvestSlug(slug: string): Promise<SolaSlugHarvestResult> {
  const clean = slug.trim().toLowerCase();
  try {
    const scrape = await scrapeSolaLocation(clean);
    if (scrape.error && scrape.listings.length === 0) {
      return {
        slug: clean,
        ok: false,
        listingsFound: 0,
        candidates: [],
        evidence: [],
        scrape,
        error: scrape.error,
      };
    }

    const apiEndpoint = discoverSolaApiEndpoint(scrape.apiHits);
    const candidates = scrape.listings.map((listing) => listingToCandidate(listing, clean));
    const evidence = scrape.listings.map((listing) =>
      listingToEvidence(listing, clean, scrape.sourceUrl, apiEndpoint),
    );

    return {
      slug: clean,
      ok: true,
      listingsFound: scrape.listings.length,
      candidates,
      evidence,
      scrape,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      slug: clean,
      ok: false,
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

  for (const slug of slugList) {
    console.log(`[sola-harvest] scraping ${slug}`);
    const result = await harvestSlug(slug);
    results.push(result);
    if (!result.ok && result.error) {
      errors.push({ slug, error: result.error });
      console.log(`[sola-harvest] ${slug} failed: ${result.error}`);
    } else {
      console.log(`[sola-harvest] ${slug}: ${result.listingsFound} listings`);
    }
  }

  const artifact: SolaHarvestArtifact = {
    harvestedAt: new Date().toISOString(),
    slugs: slugList,
    results,
    errors,
  };

  await mkdir(path.dirname(HARVEST_ARTIFACT_PATH), { recursive: true });
  await writeFile(HARVEST_ARTIFACT_PATH, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

  return artifact;
}

export { HARVEST_ARTIFACT_PATH };
