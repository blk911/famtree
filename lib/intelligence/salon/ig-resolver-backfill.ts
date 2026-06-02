// lib/intelligence/salon/ig-resolver-backfill.ts
// Backfill existing salon prospects with IG profile URLs + provider fields.

import { sanitizeHandle } from "@/lib/studios/creator-lab/ig-stubs/url-patterns";
import { fetchAndResolveIgSeeds } from "@/lib/studios/creator-lab/ig-stubs/resolve-seed";
import { resultToProspect, generateBatchId } from "@/lib/studios/prospects/from-resolver";
import { filterProspects, upsertProspect } from "@/lib/studios/prospects/store";
import type { UpsertInput } from "@/lib/studios/prospects/store";
import type { ProspectRecord } from "@/lib/studios/prospects/types";
import {
  applyGgSalonEnrichment,
  upsertInputToGgEnrichInput,
} from "./apply-gg-enrichment";

const APIFY_BATCH = 10;

export type IgResolverBackfillProspectResult = {
  handle: string;
  urlsFound: number;
  provider: string | null;
  bestUrl: string | null;
  status: string;
  errors: string[];
};

export type IgResolverBackfillSummary = {
  ok: true;
  checked: number;
  updated: number;
  skippedNoHandle: number;
  urlsFound: number;
  providersFound: number;
  websiteFound: number;
  squareFound: number;
  glossGeniusFound: number;
  vagaroFound: number;
  failed: number;
  results: IgResolverBackfillProspectResult[];
};

export function prospectMissingUrls(p: ProspectRecord): boolean {
  const hasBest = Boolean((p.bestMatch?.url ?? "").trim());
  const trail = p.linkTrailUrlsScanned ?? [];
  const dbg = p.providerDiscoveryDebug;
  const dbgUrls = [
    ...(dbg?.urlsScanned ?? []),
    ...(dbg?.directUrlsScanned ?? []),
    ...(dbg?.linkTrailUrlsScanned ?? []),
  ];
  return !hasBest && trail.length === 0 && dbgUrls.length === 0;
}

export function prospectToUpsert(p: ProspectRecord): UpsertInput {
  const {
    prospectId,
    identityFingerprint,
    createdAt,
    updatedAt,
    status,
    notes,
    validationStatus,
    archiveReason,
    ...rest
  } = p;
  return { ...rest, suggestedValidationStatus: validationStatus };
}

function mergeResolverUpsert(base: UpsertInput, resolved: UpsertInput): UpsertInput {
  return {
    ...base,
    ...resolved,
    source: base.source,
    sourcePath: base.sourcePath,
    runId: base.runId,
    harvestDate: base.harvestDate,
    sourcePlatform: base.sourcePlatform,
    sourceTool: base.sourceTool,
    sourceHashtag: base.sourceHashtag,
    sourceHashtags: base.sourceHashtags,
    vertical: base.vertical ?? "salon",
    identity: {
      ...base.identity,
      name: resolved.identity.name || base.identity.name,
      categoryGuess: base.identity.categoryGuess ?? resolved.identity.categoryGuess,
      locationGuess: base.identity.locationGuess ?? resolved.identity.locationGuess,
    },
    suggestedValidationStatus: base.suggestedValidationStatus,
    providerDiscoveryDebug: {
      ...base.providerDiscoveryDebug,
      ...resolved.providerDiscoveryDebug,
      urlsScanned:
        resolved.providerDiscoveryDebug?.urlsScanned ??
        base.providerDiscoveryDebug?.urlsScanned,
      externalUrl:
        resolved.providerDiscoveryDebug?.externalUrl ??
        base.providerDiscoveryDebug?.externalUrl,
      bioUrls:
        resolved.providerDiscoveryDebug?.bioUrls?.length
          ? resolved.providerDiscoveryDebug.bioUrls
          : base.providerDiscoveryDebug?.bioUrls,
    },
  };
}

function countUrlsFromUpsert(input: UpsertInput): number {
  const seen = new Set<string>();
  const push = (u?: string | null) => {
    const v = (u ?? "").trim();
    if (!v.startsWith("http")) return;
    seen.add(v.toLowerCase().replace(/\/+$/, ""));
  };
  push(input.bestMatch?.url);
  for (const u of input.linkTrailUrlsScanned ?? []) push(u);
  for (const u of input.candidateUrlsTested ?? []) push(u);
  for (const u of input.providerDiscoveryDebug?.urlsScanned ?? []) push(u);
  for (const u of input.providerDiscoveryDebug?.directUrlsScanned ?? []) push(u);
  for (const m of input.allMatchedUrls ?? []) push(m.url);
  return seen.size;
}

function tallyProvider(
  provider: string | null | undefined,
  counts: Pick<
    IgResolverBackfillSummary,
    "providersFound" | "squareFound" | "glossGeniusFound" | "vagaroFound"
  >,
): void {
  if (!provider || provider === "unknown" || provider === "website") return;
  counts.providersFound++;
  if (provider === "square") counts.squareFound++;
  if (provider === "glossgenius") counts.glossGeniusFound++;
  if (provider === "vagaro") counts.vagaroFound++;
}

export async function runSalonIgResolverUrlBackfill(options: {
  limit?: number;
  onlyMissingUrls?: boolean;
}): Promise<IgResolverBackfillSummary> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 250);
  const onlyMissingUrls = options.onlyMissingUrls ?? true;

  let prospects = await filterProspects({ vertical: "salon" });
  if (onlyMissingUrls) {
    prospects = prospects.filter(prospectMissingUrls);
  }

  prospects = prospects
    .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1))
    .slice(0, limit);

  const batchId = generateBatchId();
  const summary: IgResolverBackfillSummary = {
    ok: true,
    checked: 0,
    updated: 0,
    skippedNoHandle: 0,
    urlsFound: 0,
    providersFound: 0,
    websiteFound: 0,
    squareFound: 0,
    glossGeniusFound: 0,
    vagaroFound: 0,
    failed: 0,
    results: [],
  };

  const withHandle: ProspectRecord[] = [];
  for (const p of prospects) {
    const handle = sanitizeHandle(p.identity.handle);
    if (!handle) {
      summary.skippedNoHandle++;
      summary.results.push({
        handle: p.identity.handle || "—",
        urlsFound: 0,
        provider: null,
        bestUrl: null,
        status: "skipped_no_handle",
        errors: ["missing instagram handle"],
      });
      continue;
    }
    withHandle.push(p);
  }

  for (let i = 0; i < withHandle.length; i += APIFY_BATCH) {
    const chunk = withHandle.slice(i, i + APIFY_BATCH);
    const seeds = chunk.map((p) => ({
      handle: sanitizeHandle(p.identity.handle),
      displayName: p.identity.name || p.identity.handle,
    }));

    let batchResults: Awaited<ReturnType<typeof fetchAndResolveIgSeeds>>["results"];
    try {
      const fetched = await fetchAndResolveIgSeeds(seeds, "fast");
      batchResults = fetched.results;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      for (const p of chunk) {
        summary.checked++;
        summary.failed++;
        summary.results.push({
          handle: p.identity.handle,
          urlsFound: 0,
          provider: null,
          bestUrl: null,
          status: "error",
          errors: [msg],
        });
      }
      continue;
    }

    for (let j = 0; j < chunk.length; j++) {
      const prospect = chunk[j];
      const handle = seeds[j].handle;
      const result = batchResults[j];
      const rowErrors: string[] = [];
      summary.checked++;

      try {
        if (!result) {
          throw new Error("resolver returned no result");
        }

        const resolvedInput = await resultToProspect(result, batchId, {
          skipLegacyBookingEnrichment: true,
          vertical: "salon",
        });

        if (!resolvedInput) {
          const status = result.trace?.resolverDecision.status ?? result.status;
          summary.results.push({
            handle,
            urlsFound: 0,
            provider: null,
            bestUrl: null,
            status,
            errors: rowErrors,
          });
          continue;
        }

        let merged = mergeResolverUpsert(prospectToUpsert(prospect), resolvedInput);
        const enrich = await applyGgSalonEnrichment(upsertInputToGgEnrichInput(merged), {
          index: i + j,
          runGgOnAllDeduped: true,
        });
        const enrichDbg = enrich.bookingFields.providerDiscoveryDebug;
        merged = {
          ...merged,
          ...enrich.bookingFields,
          providerDiscoveryDebug: {
            ...merged.providerDiscoveryDebug,
            ...enrichDbg,
            urlsScanned: merged.providerDiscoveryDebug?.urlsScanned,
            externalUrl: merged.providerDiscoveryDebug?.externalUrl,
            bioUrls: merged.providerDiscoveryDebug?.bioUrls,
          },
        };

        await upsertProspect(merged);

        const status =
          result.trace?.resolverDecision.status ?? result.status ?? "unresolved";
        const urlsFound = countUrlsFromUpsert(merged);
        const provider =
          merged.bookingProvider && merged.bookingProvider !== "unknown"
            ? merged.bookingProvider
            : merged.bestMatch?.platform && merged.bestMatch.platform !== "website"
              ? merged.bestMatch.platform
              : null;
        const bestUrl = merged.bestMatch?.url ?? merged.bookingUrl ?? null;

        if (urlsFound > 0) {
          summary.urlsFound++;
          summary.updated++;
        }
        if (status === "website_found" || merged.bestMatch?.platform === "website") {
          summary.websiteFound++;
        }
        tallyProvider(provider, summary);

        summary.results.push({
          handle,
          urlsFound,
          provider,
          bestUrl,
          status,
          errors: rowErrors,
        });
      } catch (e) {
        summary.failed++;
        summary.results.push({
          handle,
          urlsFound: 0,
          provider: null,
          bestUrl: null,
          status: "error",
          errors: [e instanceof Error ? e.message : String(e)],
        });
      }
    }
  }

  return summary;
}
