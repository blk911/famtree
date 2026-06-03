// lib/intelligence/salon/source-ingest/directory-ingest-engine.ts

import { filterProspects, upsertProspect } from "@/lib/studios/prospects/store";
import { classifyDirectoryUrl } from "./directory-classifier";
import {
  directoryListingToUpsertInput,
  isDuplicateDirectoryCandidate,
  normalizeDirectoryListing,
} from "./directory-candidate-normalizer";
import {
  fetchVagaroDirectoryPage,
  scrapeVagaroDirectoryHtml,
} from "./vagaro-directory-scraper";
import type { DirectoryIngestRequest, DirectoryIngestResult, DirectoryRawListing } from "./types";

function generateIngestRunId(): string {
  return `dir-${Date.now().toString(36)}`;
}

const UNSUPPORTED_SCRAPER_WARNING =
  "Directory provider recognized but scraper not implemented yet; no candidates extracted.";

async function scrapeDirectoryListings(
  classification: ReturnType<typeof classifyDirectoryUrl>,
): Promise<{ listings: DirectoryRawListing[]; warnings: string[]; errors: string[] }> {
  const warnings = [...classification.warnings];
  const errors: string[] = [];

  if (!classification.directoryUrl) {
    return { listings: [], warnings, errors: ["Directory URL is required."] };
  }

  if (classification.sourceType === "unknown_directory") {
    return { listings: [], warnings, errors };
  }

  if (classification.provider === "vagaro") {
    try {
      const html = await fetchVagaroDirectoryPage(classification.directoryUrl);
      const scraped = scrapeVagaroDirectoryHtml(html, classification.directoryUrl, {
        market: classification.market,
        category: classification.category,
      });
      return {
        listings: scraped.listings,
        warnings: [...warnings, ...scraped.warnings],
        errors,
      };
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
      return { listings: [], warnings, errors };
    }
  }

  warnings.push(UNSUPPORTED_SCRAPER_WARNING);
  return { listings: [], warnings, errors };
}

export async function runDirectoryUrlIngest(
  input: DirectoryIngestRequest,
): Promise<DirectoryIngestResult> {
  const classification = classifyDirectoryUrl(input.url, {
    market: input.market,
    category: input.category,
  });

  const ingestRunId = generateIngestRunId();
  const { listings: rawListings, warnings, errors } = await scrapeDirectoryListings(classification);

  const candidates = rawListings.map(normalizeDirectoryListing);
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
      errors.push(
        `Failed to store "${candidate.displayName}": ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  return {
    ok: Boolean(classification.directoryUrl) && errors.length === 0,
    sourceType: classification.sourceType,
    provider: classification.provider,
    providerLabel: classification.providerLabel,
    directoryUrl: classification.directoryUrl,
    market: input.market,
    category: input.category,
    notes: input.notes,
    candidatesFound,
    candidatesCreated,
    duplicates,
    warnings,
    errors,
    ingestRunId,
  };
}
