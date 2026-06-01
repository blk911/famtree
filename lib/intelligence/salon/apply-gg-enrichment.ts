// lib/intelligence/salon/apply-gg-enrichment.ts
// Salon provider discovery pass (trail-first, GG fallback) with run diagnostics.

import type { UpsertInput } from "@/lib/studios/prospects/store";
import {
  DEFAULT_GG_RESOLVER_CAP,
  emptyGgRunDiagnostics,
  mergeGgRunDiagnostics,
  type GgResolverRunDiagnostics,
  type ProspectGgResolverStatus,
} from "./gg-resolver-types";
import {
  enrichSalonProviderDiscovery,
  type SalonProviderDiscoveryInput,
} from "./salon-provider-discovery";
import type { EnrichedProspectBookingFields } from "./enrich-booking-provider";

export type GgEnrichmentInput = SalonProviderDiscoveryInput;

export type GgProspectDiagnostics = {
  ggResolverStatus: ProspectGgResolverStatus;
  ggCheckedUrls?: string[];
  ggResolverReason?: string;
};

export type ApplyGgOptions = {
  index: number;
  maxProbes?: number;
  runGgOnAllDeduped?: boolean;
};

export type SalonBookingEnrichmentFields = EnrichedProspectBookingFields &
  Partial<
    Pick<
      UpsertInput,
      "providerResolverReason" | "providerDiscoveryDebug" | "ggCheckedUrls"
    >
  >;

export function upsertInputToGgEnrichInput(upsert: UpsertInput): GgEnrichmentInput {
  const handle = upsert.identity.handle.replace(/^@/, "");
  return {
    instagramHandle: upsert.identity.handle,
    displayName: upsert.identity.name,
    website: upsert.bestMatch?.url,
    bioUrl: handle ? `https://www.instagram.com/${handle}/` : undefined,
    bio: (upsert.evidence ?? []).filter((e) => typeof e === "string").join(" "),
    bestMatchUrl: upsert.bestMatch?.url,
    allMatchedUrls: upsert.allMatchedUrls,
    linkTrailUrls: upsert.linkTrailUrlsScanned,
    linkTrailUrlsScanned: upsert.linkTrailUrlsScanned,
    linkInBioUrl: upsert.linkInBioUrl,
    linkInBioPageFetched: upsert.linkInBioPageFetched,
    evidence: upsert.evidence,
    bookingProvider: upsert.bookingProvider,
    bookingProviderConfidence: upsert.bookingProviderConfidence,
    bookingProviderSource: upsert.bookingProviderSource,
    bookingUrl: upsert.bookingUrl,
  };
}

function runDeltaFromResult(
  result: Awaited<ReturnType<typeof enrichSalonProviderDiscovery>>,
  ggSkippedCap: boolean,
): Partial<GgResolverRunDiagnostics> {
  const d = result.providerDiscoveryDebug;
  const delta: Partial<GgResolverRunDiagnostics> = {
    ggCheckedUrlsCount: d.ggCheckedUrls.length,
  };

  if (ggSkippedCap) {
    delta.ggSkippedCap = 1;
    return delta;
  }

  if (result.bookingProvider && result.ggResolverStatus === "skipped_existing_provider") {
    delta.ggSkippedProviderAlreadyDetected = 1;
    delta.ggEligibleProspects = 1;
    return delta;
  }

  if (!d.ggHandleAttempted && !d.ggDisplayAttempted && !result.bookingProvider) {
    if (result.ggResolverStatus === "skipped_no_handle") {
      delta.ggSkippedNoHandle = 1;
    }
    return delta;
  }

  delta.ggEligibleProspects = 1;

  if (d.ggHandleAttempted) delta.ggAttemptedHandle = 1;
  if (d.ggDisplayAttempted) delta.ggAttemptedDisplay = 1;

  if (result.ggResolverStatus === "found_handle") {
    delta.ggFoundHandle = 1;
  } else if (result.ggResolverStatus === "found_display") {
    delta.ggFoundDisplay = 1;
  } else if (result.ggResolverStatus === "attempted_not_found") {
    delta.ggNotFound = 1;
  } else if (result.ggResolverStatus === "timeout") {
    delta.ggTimeout = 1;
  } else if (result.ggResolverStatus === "error") {
    delta.ggError = 1;
  }

  if (d.providerDetectedFromDirect || d.providerDetectedFromLinkTrail) {
    delta.ggSkippedProviderAlreadyDetected = 0;
    if (result.bookingProvider && result.ggResolverStatus === "skipped_existing_provider") {
      delta.ggSkippedProviderAlreadyDetected = 1;
    }
  }

  return delta;
}

/**
 * Full salon provider discovery for one prospect (link trail + optional GG fallback).
 */
export async function applyGgSalonEnrichment(
  input: GgEnrichmentInput,
  options: ApplyGgOptions,
): Promise<{
  bookingFields: SalonBookingEnrichmentFields;
  gg: GgProspectDiagnostics;
  runDelta: Partial<GgResolverRunDiagnostics>;
}> {
  const maxProbes = options.runGgOnAllDeduped
    ? Number.MAX_SAFE_INTEGER
    : (options.maxProbes ?? DEFAULT_GG_RESOLVER_CAP);

  const handle = (input.instagramHandle ?? "").replace(/^@+/, "").trim();
  if (!handle) {
    return {
      bookingFields: {},
      gg: { ggResolverStatus: "skipped_no_handle", ggResolverReason: "no_instagram_handle" },
      runDelta: { ggSkippedNoHandle: 1 },
    };
  }

  const ggSkippedCap = !options.runGgOnAllDeduped && options.index >= maxProbes;
  const enableGg = !ggSkippedCap;

  const result = await enrichSalonProviderDiscovery(input, {
    enableGgFallback: enableGg,
  });

  const {
    providerDiscoveryDebug,
    ggResolverStatus,
    ggResolverReason,
    ggCheckedUrls,
    ...bookingFields
  } = result;

  return {
    bookingFields: {
      ...bookingFields,
      providerResolverReason: providerDiscoveryDebug.providerResolverReason,
      providerDiscoveryDebug,
    },
    gg: {
      ggResolverStatus: ggSkippedCap
        ? "skipped_cap"
        : (ggResolverStatus ?? "not_attempted"),
      ggCheckedUrls: providerDiscoveryDebug.ggCheckedUrls,
      ggResolverReason: ggSkippedCap
        ? `cap_exceeded_index_${options.index}_max_${maxProbes}`
        : ggResolverReason,
    },
    runDelta: runDeltaFromResult(result, ggSkippedCap),
  };
}

export async function runGgPassForUpserts(
  upserts: UpsertInput[],
  options?: { maxProbes?: number; runGgOnAllDeduped?: boolean },
): Promise<{ upserts: UpsertInput[]; ggRun: GgResolverRunDiagnostics }> {
  const ggRun = emptyGgRunDiagnostics();
  ggRun.dedupedProspects = upserts.length;

  const out: UpsertInput[] = [];
  for (let i = 0; i < upserts.length; i++) {
    const base = upserts[i];
    const { bookingFields, gg, runDelta } = await applyGgSalonEnrichment(
      upsertInputToGgEnrichInput(base),
      {
        index: i,
        maxProbes: options?.maxProbes,
        runGgOnAllDeduped: options?.runGgOnAllDeduped,
      },
    );
    mergeGgRunDiagnostics(ggRun, runDelta);
    out.push({
      ...base,
      ...bookingFields,
      ggResolverStatus: gg.ggResolverStatus,
      ggCheckedUrls: gg.ggCheckedUrls,
      ggResolverReason: gg.ggResolverReason,
    });
  }
  return { upserts: out, ggRun };
}
