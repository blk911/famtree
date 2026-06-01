// lib/intelligence/salon/ggen-seed-discovery/discover.ts

import {
  collectGlossGeniusCandidates,
  resolveGlossGeniusFromHandle,
} from "@/lib/intelligence/salon/glossgenius-handle-resolver";
import {
  detectSalonBookingProvider,
  confidenceToNumber,
} from "@/lib/intelligence/salon/provider-detector";
import { isSalonImportCandidate } from "@/lib/intelligence/salon/import-candidate";
import { validateGlossGeniusPage } from "@/lib/intelligence/salon/glossgenius-page-validator";
import type { ProspectRecord } from "@/lib/studios/prospects/types";
import { businessNameToHandleHint, normalizeBusinessName } from "./parse";
import { searchGlossGeniusUrlsForBusiness } from "./search";
import { matchSalonProspectsForSeed } from "./match-prospects";
import type { GgenSeedDiscoveryResult, GgenSeedInput, GgenDiscoverySource } from "./types";

const IMPORT_CONFIDENCE_MIN = 55;
const MAX_CANDIDATES = 8;
const SEARCH_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function makeResultId(runId: string, index: number): string {
  return `${runId}-row-${index}`;
}

function isImportCandidate(confidence: number, bookingUrl: string): boolean {
  return (
    confidence >= 55 &&
    isSalonImportCandidate({
      bookingProvider: "glossgenius",
      bookingUrl,
      bookingProviderConfidence: confidence,
      offerFitTags: ["backoffice_import_candidate"],
    } as ProspectRecord)
  );
}

function hitFromProbe(
  bookingUrl: string,
  confidence: number,
  source: GgenDiscoverySource,
  evidence: string[],
  candidatesChecked: string[],
  searchQueries: string[],
): Pick<
  GgenSeedDiscoveryResult,
  "found" | "bookingProvider" | "bookingUrl" | "confidence" | "discoverySource" | "evidence"
> {
  const det = detectSalonBookingProvider(bookingUrl);
  const conf = Math.max(confidence, det ? confidenceToNumber(det.confidence) : 0);
  return {
    found: true,
    bookingProvider: "glossgenius",
    bookingUrl: det?.bookingUrl ?? bookingUrl,
    confidence: conf,
    discoverySource: source,
    evidence: [...evidence, ...(det?.evidence ?? [])],
  };
}

export async function discoverGgenForSeed(
  seed: GgenSeedInput,
  runId: string,
  index: number,
  options?: { enableSearch?: boolean; matchProspects?: boolean },
): Promise<GgenSeedDiscoveryResult> {
  const id = makeResultId(runId, index);
  const normalizedName = normalizeBusinessName(seed.businessName);
  const handleHint = businessNameToHandleHint(seed.businessName);

  const candidates = collectGlossGeniusCandidates({
    instagramHandle: handleHint,
    displayName: seed.businessName,
  }).slice(0, MAX_CANDIDATES);

  const candidatesChecked = candidates.map((c) => c.url);
  const base: GgenSeedDiscoveryResult = {
    id,
    businessName: seed.businessName,
    normalizedName,
    category: seed.category ?? null,
    city: seed.city ?? null,
    state: seed.state ?? null,
    found: false,
    bookingProvider: null,
    bookingUrl: null,
    confidence: 0,
    discoverySource: null,
    evidence: [],
    searchQueries: [],
    candidatesChecked,
    importCandidate: false,
    matchedProspectIds: [],
    matchedProspectHandles: [],
  };

  try {
    const probe = await resolveGlossGeniusFromHandle({
      instagramHandle: handleHint,
      displayName: seed.businessName,
    });

    if (
      probe.found &&
      probe.bookingUrl &&
      probe.ggValidationStatus === "confirmed_client_page"
    ) {
      const hit = hitFromProbe(
        probe.bookingUrl,
        probe.confidence,
        "candidate_probe",
        probe.evidence ?? [],
        candidatesChecked,
        [],
      );
      const merged = { ...base, ...hit, candidatesChecked: probe.checkedUrls ?? candidatesChecked };
      merged.importCandidate = isImportCandidate(merged.confidence, merged.bookingUrl!);
      if (options?.matchProspects !== false) {
        const matches = await matchSalonProspectsForSeed(seed);
        merged.matchedProspectIds = matches.map((m) => m.prospectId);
        merged.matchedProspectHandles = matches.map((m) => m.handle);
      }
      return merged;
    }

    if (options?.enableSearch !== false) {
      await sleep(SEARCH_DELAY_MS);
      const { queries, urls } = await searchGlossGeniusUrlsForBusiness({
        businessName: seed.businessName,
        city: seed.city,
        state: seed.state,
        maxQueries: 2,
      });
      base.searchQueries = queries;

      for (const url of urls) {
        const det = detectSalonBookingProvider(url);
        if (det?.provider !== "glossgenius") continue;
        const conf = confidenceToNumber(det.confidence);
        const merged: GgenSeedDiscoveryResult = {
          ...base,
          ...hitFromProbe(
            det.bookingUrl ?? url,
            Math.max(conf, IMPORT_CONFIDENCE_MIN),
            "seed_search",
            [`search hit: ${url}`, ...det.evidence],
            [...candidatesChecked, url],
            queries,
          ),
          searchQueries: queries,
          candidatesChecked: Array.from(new Set([...candidatesChecked, url])),
        };
        merged.importCandidate = isImportCandidate(merged.confidence, merged.bookingUrl!);
        if (options?.matchProspects !== false) {
          const matches = await matchSalonProspectsForSeed(seed);
          merged.matchedProspectIds = matches.map((m) => m.prospectId);
          merged.matchedProspectHandles = matches.map((m) => m.handle);
        }
        return merged;
      }
    }

    if (options?.matchProspects !== false) {
      const matches = await matchSalonProspectsForSeed(seed);
      base.matchedProspectIds = matches.map((m) => m.prospectId);
      base.matchedProspectHandles = matches.map((m) => m.handle);
    }
    base.evidence.push("no glossgenius page found via candidate probe or public search");
    return base;
  } catch (e) {
    base.error = e instanceof Error ? e.message : String(e);
    return base;
  }
}
