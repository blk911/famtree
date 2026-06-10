// lib/intelligence/salon/source-ingest/directory-ingest-engine.ts

import { buildMarketCandidatesRegistry } from "@/lib/markets/build-market-candidates";
import { buildSolaResolverImport } from "@/lib/operators/sources/sola/build-resolver-import";
import { runSolaHarvest } from "@/lib/operators/sources/sola/run-sola-harvest";
import { filterProspects, upsertProspect } from "@/lib/studios/prospects/store";
import { classifyDirectoryUrl } from "./directory-classifier";
import {
  directoryListingToUpsertInput,
  isDuplicateDirectoryCandidate,
  normalizeDirectoryListing,
} from "./directory-candidate-normalizer";
import {
  fetchVagaroDirectoryPage,
  isVagaroDirectoryUrl,
  scrapeVagaroDirectoryHtml,
} from "./vagaro-directory-scraper";
import { scrapeVagaroDirectoryTiered } from "./vagaro-browser-scraper";
import { getPlaywrightRuntimeStatus } from "./playwright-runtime";
import type {
  DirectoryIngestRequest,
  DirectoryIngestResult,
  DirectoryRawListing,
  DirectoryScrollMode,
} from "./types";

function generateIngestRunId(): string {
  return `dir-${Date.now().toString(36)}`;
}

const UNSUPPORTED_SCRAPER_WARNING =
  "Directory provider recognized but scraper not implemented yet; no candidates extracted.";

type ScrapeOutcome = {
  listings: DirectoryRawListing[];
  warnings: string[];
  errors: string[];
  staticCandidatesFound: number;
  browserCandidatesFound: number;
  scrollModeUsed: DirectoryScrollMode;
  scrollAttempts: number;
  browserAvailable: boolean;
};

async function scrapeVagaroListings(
  directoryUrl: string,
  classification: ReturnType<typeof classifyDirectoryUrl>,
  fullScroll: boolean,
): Promise<ScrapeOutcome> {
  const warnings: string[] = [];
  const errors: string[] = [];

  const html = await fetchVagaroDirectoryPage(directoryUrl);
  const staticScraped = scrapeVagaroDirectoryHtml(html, directoryUrl, {
    market: classification.market,
    category: classification.category,
  });
  warnings.push(...staticScraped.warnings);

  const tiered = await scrapeVagaroDirectoryTiered(
    directoryUrl,
    staticScraped.listings,
    fullScroll,
    {
      market: classification.market,
      category: classification.category,
    },
  );
  warnings.push(...tiered.warnings);

  return {
    listings: tiered.listings,
    warnings,
    errors,
    staticCandidatesFound: tiered.staticCandidatesFound,
    browserCandidatesFound: tiered.browserCandidatesFound,
    scrollModeUsed: tiered.scrollModeUsed,
    scrollAttempts: tiered.scrollAttempts,
    browserAvailable: tiered.browserAvailable,
  };
}

async function scrapeDirectoryListings(
  classification: ReturnType<typeof classifyDirectoryUrl>,
  options?: { fullScroll?: boolean },
): Promise<ScrapeOutcome> {
  const warnings = [...classification.warnings];
  const errors: string[] = [];
  const runtime = await getPlaywrightRuntimeStatus();
  const emptyMetrics = {
    staticCandidatesFound: 0,
    browserCandidatesFound: 0,
    scrollModeUsed: "static" as const,
    scrollAttempts: 0,
    browserAvailable: runtime.browserAvailable,
  };

  if (!classification.directoryUrl) {
    return { listings: [], warnings, errors: ["Directory URL is required."], ...emptyMetrics };
  }

  if (classification.sourceType === "unknown_directory") {
    return { listings: [], warnings, errors, ...emptyMetrics };
  }

  if (classification.provider === "vagaro") {
    try {
      const fullScroll = options?.fullScroll === true;
      const scraped = await scrapeVagaroListings(
        classification.directoryUrl,
        classification,
        fullScroll,
      );
      return {
        listings: scraped.listings,
        warnings: [...warnings, ...scraped.warnings],
        errors: scraped.errors,
        staticCandidatesFound: scraped.staticCandidatesFound,
        browserCandidatesFound: scraped.browserCandidatesFound,
        scrollModeUsed: scraped.scrollModeUsed,
        scrollAttempts: scraped.scrollAttempts,
        browserAvailable: scraped.browserAvailable,
      };
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
      return { listings: [], warnings, errors, ...emptyMetrics };
    }
  }

  warnings.push(UNSUPPORTED_SCRAPER_WARNING);
  return { listings: [], warnings, errors, ...emptyMetrics };
}

async function runSolaDirectoryIngest(
  classification: ReturnType<typeof classifyDirectoryUrl>,
  input: DirectoryIngestRequest,
  ingestRunId: string,
): Promise<DirectoryIngestResult> {
  const slug = classification.solaSlug;
  const warnings = [...classification.warnings];
  const errors: string[] = [];

  if (!slug) {
    return {
      ok: false,
      sourceType: classification.sourceType,
      provider: classification.provider,
      providerLabel: classification.providerLabel,
      directoryUrl: classification.directoryUrl,
      market: input.market,
      category: input.category,
      notes: input.notes,
      candidatesFound: 0,
      candidatesCreated: 0,
      duplicates: 0,
      warnings,
      errors: ["Sola location slug could not be parsed from the URL."],
      ingestRunId,
    };
  }

  try {
    const { harvest } = await runSolaHarvest(slug, { enrichProfiles: true });
    const slugResult = harvest.results.find((row) => row.slug === slug) ?? harvest.results[0];

    if (!slugResult?.ok) {
      errors.push(slugResult?.error ?? `Sola harvest failed for slug "${slug}".`);
      return {
        ok: false,
        sourceType: classification.sourceType,
        provider: classification.provider,
        providerLabel: classification.providerLabel,
        directoryUrl: classification.directoryUrl,
        solaSlug: slug,
        listingsFound: slugResult?.listingsFound ?? 0,
        profilesEnriched: slugResult?.profilesEnriched ?? 0,
        market: input.market,
        category: input.category,
        notes: input.notes,
        candidatesFound: slugResult?.candidatesCreated ?? 0,
        candidatesCreated: slugResult?.candidatesCreated ?? 0,
        duplicates: 0,
        warnings,
        errors,
        ingestRunId,
      };
    }

    await buildSolaResolverImport();
    await buildMarketCandidatesRegistry();

    const listingsFound = slugResult.listingsFound;
    const profilesEnriched = slugResult.profilesEnriched ?? 0;
    const candidatesCreated = slugResult.candidatesCreated;

    return {
      ok: true,
      sourceType: classification.sourceType,
      provider: classification.provider,
      providerLabel: classification.providerLabel,
      directoryUrl: classification.directoryUrl,
      solaSlug: slug,
      listingsFound,
      profilesEnriched,
      market: input.market,
      category: input.category,
      notes: input.notes,
      candidatesFound: candidatesCreated,
      candidatesCreated,
      duplicates: 0,
      warnings,
      errors,
      ingestRunId,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    errors.push(message);
    return {
      ok: false,
      sourceType: classification.sourceType,
      provider: classification.provider,
      providerLabel: classification.providerLabel,
      directoryUrl: classification.directoryUrl,
      solaSlug: slug,
      market: input.market,
      category: input.category,
      notes: input.notes,
      candidatesFound: 0,
      candidatesCreated: 0,
      duplicates: 0,
      warnings,
      errors,
      ingestRunId,
    };
  }
}

export async function runDirectoryUrlIngest(
  input: DirectoryIngestRequest,
): Promise<DirectoryIngestResult> {
  const classification = classifyDirectoryUrl(input.url, {
    market: input.market,
    category: input.category,
  });

  const ingestRunId = generateIngestRunId();

  if (classification.provider === "sola" && classification.solaSlug) {
    return runSolaDirectoryIngest(classification, input, ingestRunId);
  }
  const fullScroll =
    input.fullScroll === true ||
    (input.fullScroll !== false &&
      classification.provider === "vagaro" &&
      isVagaroDirectoryUrl(classification.directoryUrl));

  const scraped = await scrapeDirectoryListings(classification, { fullScroll });

  const candidates = scraped.listings.map(normalizeDirectoryListing);
  const candidatesFound = candidates.length;

  const existing = await filterProspects({ vertical: "salon" });

  let duplicates = 0;
  let candidatesCreated = 0;

  for (const candidate of candidates) {
    if (isDuplicateDirectoryCandidate(candidate, existing)) {
      duplicates++;
      continue;
    }

    try {
      const upsert = directoryListingToUpsertInput(
        candidate,
        classification,
        ingestRunId,
        input.notes,
      );
      const record = await upsertProspect(upsert);
      candidatesCreated++;
      existing.push(record);
    } catch (e) {
      scraped.errors.push(
        `Failed to store "${candidate.displayName}": ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  return {
    ok: Boolean(classification.directoryUrl) && scraped.errors.length === 0,
    sourceType: classification.sourceType,
    provider: classification.provider,
    providerLabel: classification.providerLabel,
    directoryUrl: classification.directoryUrl,
    market: input.market,
    category: input.category,
    notes: input.notes,
    candidatesFound,
    candidatesCreated,
    staticCandidatesFound: scraped.staticCandidatesFound,
    browserCandidatesFound: scraped.browserCandidatesFound,
    scrollModeUsed: scraped.scrollModeUsed,
    scrollAttempts: scraped.scrollAttempts,
    browserAvailable: scraped.browserAvailable,
    duplicates,
    warnings: scraped.warnings,
    errors: scraped.errors,
    ingestRunId,
  };
}
