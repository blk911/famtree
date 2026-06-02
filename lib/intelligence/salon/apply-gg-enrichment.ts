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
import type { SalonProviderDiscoveryInput } from "./salon-provider-discovery";
import type { EnrichedProspectBookingFields } from "./enrich-booking-provider";
import {
  discoverSalonPublicPresence,
  mapDiscoveryToBookingFields,
} from "./public-presence/discovery-engine";
import { upsertPresenceResults } from "./public-presence/presence-store";
import type { SalonPublicPresenceDiscoveryResult } from "./public-presence/types";
import { enrichProspectWithBusinessStack } from "./business-stack/apply-stack-enrichment";
import type { SalonBusinessStack } from "./business-stack/types";

export type GgEnrichmentInput = SalonProviderDiscoveryInput & { prospectId?: string };

export type GgProspectDiagnostics = {
  ggResolverStatus: ProspectGgResolverStatus;
  ggCheckedUrls?: string[];
  ggResolverReason?: string;
};

export type ApplyGgOptions = {
  index: number;
  maxProbes?: number;
  runGgOnAllDeduped?: boolean;
  runPublicSearch?: boolean;
  forceSearch?: boolean;
  crawlWebsite?: boolean;
};

export type SalonBookingEnrichmentFields = EnrichedProspectBookingFields &
  Partial<
    Pick<
      UpsertInput,
      | "providerResolverReason"
      | "providerDiscoveryDebug"
      | "ggCheckedUrls"
      | "ggCandidateUrls"
      | "ggValidatedUrl"
      | "ggValidationStatus"
    >
  >;

export function upsertInputToGgEnrichInput(upsert: UpsertInput): GgEnrichmentInput {
  const handle = upsert.identity.handle.replace(/^@/, "");
  const websiteFromMatch =
    upsert.bestMatch?.platform === "website" ? upsert.bestMatch.url : undefined;

  return {
    instagramHandle: upsert.identity.handle,
    displayName: upsert.identity.name,
    website: websiteFromMatch,
    bioUrl: handle ? `https://www.instagram.com/${handle}/` : undefined,
    bio: (upsert.evidence ?? [])
      .filter((e) => typeof e === "string")
      .map((e) => (e.startsWith("IG bio:") ? e.replace(/^IG bio:\s*/, "") : e))
      .join(" "),
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

export type SalonDiscoveryEnrichmentResult = {
  discovery: SalonPublicPresenceDiscoveryResult;
  bookingFields: SalonBookingEnrichmentFields;
  providerDiscoveryDebug: NonNullable<SalonBookingEnrichmentFields["providerDiscoveryDebug"]>;
  ggResolverStatus: ProspectGgResolverStatus;
  ggResolverReason?: string;
};

function discoveryToLegacyResult(
  discovery: SalonPublicPresenceDiscoveryResult,
  enableGg: boolean,
): SalonDiscoveryEnrichmentResult {
  const mapped = mapDiscoveryToBookingFields(discovery);
  const d = discovery.diagnostics;
  const best = discovery.bestProvider;
  const ggAttempted = d.ggFallbackAttempted;
  const ggFound = d.ggFallbackFound;

  const providerDiscoveryDebug = {
    directUrlsScanned: [] as string[],
    linkTrailUrlsScanned: [] as string[],
    linkInBioFetched: d.linkTrailUrlsScanned > 0,
    providerDetectedFromDirect: best?.source === "ig_direct_url",
    providerDetectedFromLinkTrail: best?.source === "link_in_bio",
    ggHandleAttempted: ggAttempted && best?.source === "provider_guess",
    ggDisplayAttempted: false,
    ggCheckedUrls: best?.ggCandidateUrls ?? [],
    providerResolverReason:
      mapped.providerResolverReason ?? `public_presence:${best?.source ?? "none"}`,
  };

  let ggResolverStatus: ProspectGgResolverStatus = "not_attempted";
  if (!enableGg && !ggAttempted) ggResolverStatus = "skipped_cap";
  else if (mapped.bookingProvider && best?.source !== "provider_guess") {
    ggResolverStatus = "skipped_existing_provider";
  } else if (ggFound) ggResolverStatus = "found_handle";
  else if (ggAttempted) ggResolverStatus = "attempted_not_found";

  return {
    discovery,
    bookingFields: {
      ...mapped,
      providerDiscoveryDebug,
      providerResolverReason: mapped.providerResolverReason,
      ggCandidateUrls: best?.ggCandidateUrls,
      ggValidatedUrl: best?.ggValidatedUrl,
      ggValidationStatus: best?.ggValidationStatus as SalonBookingEnrichmentFields["ggValidationStatus"],
    },
    providerDiscoveryDebug,
    ggResolverStatus,
    ggResolverReason: mapped.providerResolverReason,
  };
}

function runDeltaFromDiscovery(
  legacy: SalonDiscoveryEnrichmentResult,
  ggSkippedCap: boolean,
): Partial<GgResolverRunDiagnostics> {
  const d = legacy.providerDiscoveryDebug;
  const delta: Partial<GgResolverRunDiagnostics> = {
    ggCheckedUrlsCount: d.ggCheckedUrls?.length ?? 0,
  };

  if (ggSkippedCap) {
    delta.ggSkippedCap = 1;
    return delta;
  }

  if (
    legacy.bookingFields.bookingProvider &&
    legacy.ggResolverStatus === "skipped_existing_provider"
  ) {
    delta.ggSkippedProviderAlreadyDetected = 1;
    delta.ggEligibleProspects = 1;
    return delta;
  }

  if (!d.ggHandleAttempted && !d.ggDisplayAttempted && !legacy.bookingFields.bookingProvider) {
    if (legacy.ggResolverStatus === "skipped_no_handle") {
      delta.ggSkippedNoHandle = 1;
    }
    return delta;
  }

  delta.ggEligibleProspects = 1;

  if (d.ggHandleAttempted) delta.ggAttemptedHandle = 1;
  if (d.ggDisplayAttempted) delta.ggAttemptedDisplay = 1;

  const candidatesTested =
    legacy.bookingFields.ggCandidateUrls?.length ?? d.ggCheckedUrls?.length ?? 0;
  if (candidatesTested > 0) {
    delta.ggCandidatesTested = (delta.ggCandidatesTested ?? 0) + candidatesTested;
  }

  const vs = legacy.bookingFields.ggValidationStatus;
  if (vs === "confirmed_client_page") {
    delta.ggConfirmedClientPages = 1;
    if (legacy.ggResolverStatus === "found_display") delta.ggFoundDisplay = 1;
    else delta.ggFoundHandle = 1;
  } else if (vs === "generic_glossgenius_page" || vs === "redirect_home") {
    delta.ggGenericHomepage = 1;
  } else if (vs === "not_found") {
    delta.ggNotFound = 1;
  } else if (vs === "timeout" || legacy.ggResolverStatus === "timeout") {
    delta.ggTimeouts = 1;
    delta.ggTimeout = 1;
  } else if (legacy.ggResolverStatus === "found_handle") {
    delta.ggFoundHandle = 1;
  } else if (legacy.ggResolverStatus === "found_display") {
    delta.ggFoundDisplay = 1;
  } else if (
    legacy.ggResolverStatus === "attempted_not_found" ||
    legacy.ggResolverStatus === "candidate_only"
  ) {
    delta.ggNotFound = 1;
  } else if (legacy.ggResolverStatus === "generic_homepage") {
    delta.ggGenericHomepage = 1;
  } else if (legacy.ggResolverStatus === "error") {
    delta.ggError = 1;
  }

  if (d.providerDetectedFromDirect || d.providerDetectedFromLinkTrail) {
    delta.ggSkippedProviderAlreadyDetected = 0;
    if (
      legacy.bookingFields.bookingProvider &&
      legacy.ggResolverStatus === "skipped_existing_provider"
    ) {
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
  result: SalonDiscoveryEnrichmentResult;
  businessStack?: SalonBusinessStack;
  runDelta: Partial<GgResolverRunDiagnostics>;
}> {
  const maxProbes = options.runGgOnAllDeduped
    ? Number.MAX_SAFE_INTEGER
    : (options.maxProbes ?? DEFAULT_GG_RESOLVER_CAP);

  const handle = (input.instagramHandle ?? "").replace(/^@+/, "").trim();
  if (!handle) {
    const empty = discoveryToLegacyResult(
      {
        identity: {
          extractedKeywords: [],
          searchQueries: [],
        },
        presenceResults: [],
        diagnostics: {
          directUrlsScanned: 0,
          linkTrailUrlsScanned: 0,
          searchQueriesRun: 0,
          searchResultsScanned: 0,
          providerUrlsFound: 0,
          websiteUrlsFound: 0,
          ggFallbackAttempted: false,
          ggFallbackFound: false,
          searchProvider: "disabled",
          errors: [],
        },
      },
      false,
    );
    return {
      bookingFields: {},
      gg: { ggResolverStatus: "skipped_no_handle", ggResolverReason: "no_instagram_handle" },
      result: empty,
      runDelta: { ggSkippedNoHandle: 1 },
    };
  }

  const ggSkippedCap = !options.runGgOnAllDeduped && options.index >= maxProbes;
  const enableGg = !ggSkippedCap;

  const discovery = await discoverSalonPublicPresence(
    {
      prospectId: undefined,
      instagramHandle: handle,
      displayName: input.displayName,
      bio: input.bio,
      website: input.website,
      bioUrl: input.bioUrl,
      bestMatchUrl: input.bestMatchUrl,
      allMatchedUrls: input.allMatchedUrls,
      linkTrailUrls: input.linkTrailUrls,
      linkTrailUrlsScanned: input.linkTrailUrlsScanned,
      linkInBioUrl: input.linkInBioUrl,
      linkInBioPageFetched: input.linkInBioPageFetched,
      evidence: input.evidence,
      bookingProvider: input.bookingProvider,
      bookingProviderConfidence: input.bookingProviderConfidence,
      bookingProviderSource: input.bookingProviderSource,
      bookingUrl: input.bookingUrl,
    },
    {
      enableGgFallback: enableGg,
      enableSearch: options.runPublicSearch ?? false,
      forceSearch: options.forceSearch,
    },
  );

  if (discovery.presenceResults.length > 0) {
    try {
      await upsertPresenceResults(discovery.presenceResults);
    } catch {
      // non-fatal
    }
  }

  const legacy = discoveryToLegacyResult(discovery, enableGg);

  let bookingFields = { ...legacy.bookingFields };
  let businessStack: SalonBusinessStack | undefined;
  try {
    const stackResult = await enrichProspectWithBusinessStack(
      {
        prospectId: input.prospectId,
        instagramHandle: handle,
        displayName: input.displayName ?? undefined,
        website: input.website ?? undefined,
        bioUrl: input.bioUrl ?? undefined,
        bestMatchUrl: input.bestMatchUrl ?? undefined,
        allMatchedUrls: input.allMatchedUrls,
        linkTrailUrls: input.linkTrailUrls,
        linkTrailUrlsScanned: input.linkTrailUrlsScanned,
        linkInBioUrl: input.linkInBioUrl ?? undefined,
        bookingProvider: bookingFields.bookingProvider,
        bookingProviderConfidence: bookingFields.bookingProviderConfidence,
        bookingProviderSource: bookingFields.bookingProviderSource,
        bookingUrl: bookingFields.bookingUrl ?? undefined,
      },
      {
        crawlWebsite: options.crawlWebsite ?? options.runPublicSearch ?? false,
        persist: false,
      },
    );
    businessStack = {
      ...stackResult.stack,
      prospectId: input.prospectId ?? stackResult.stack.prospectId,
    };
    if (stackResult.bookingUpgrade) {
      const upgrade = stackResult.bookingUpgrade;
      bookingFields = {
        ...bookingFields,
        ...upgrade,
        bookingProviderEvidence: upgrade.bookingProviderEvidence,
      };
    }
  } catch {
    // stack enrichment must not block harvest
  }

  return {
    bookingFields,
    gg: {
      ggResolverStatus: ggSkippedCap
        ? "skipped_cap"
        : legacy.ggResolverStatus,
      ggCheckedUrls: legacy.providerDiscoveryDebug.ggCheckedUrls,
      ggResolverReason: ggSkippedCap
        ? `cap_exceeded_index_${options.index}_max_${maxProbes}`
        : legacy.ggResolverReason,
    },
    result: legacy,
    businessStack,
    runDelta: runDeltaFromDiscovery(legacy, ggSkippedCap),
  };
}

export async function runGgPassForUpserts(
  upserts: UpsertInput[],
  options?: {
    maxProbes?: number;
    runGgOnAllDeduped?: boolean;
    runPublicSearch?: boolean;
    forceSearch?: boolean;
    crawlWebsite?: boolean;
  },
): Promise<{ upserts: UpsertInput[]; ggRun: GgResolverRunDiagnostics }> {
  const ggRun = emptyGgRunDiagnostics();
  ggRun.dedupedProspects = upserts.length;

  const out: UpsertInput[] = [];
  for (let i = 0; i < upserts.length; i++) {
    const base = upserts[i];
    const { bookingFields, gg, result: enrichResult, businessStack, runDelta } =
      await applyGgSalonEnrichment(
      upsertInputToGgEnrichInput(base),
      {
        index: i,
        maxProbes: options?.maxProbes,
        runGgOnAllDeduped: options?.runGgOnAllDeduped,
        runPublicSearch: options?.runPublicSearch,
        forceSearch: options?.forceSearch,
        crawlWebsite: options?.crawlWebsite,
      },
    );
    mergeGgRunDiagnostics(ggRun, runDelta);
    out.push({
      ...base,
      ...bookingFields,
      ggResolverStatus: gg.ggResolverStatus,
      ggCheckedUrls: gg.ggCheckedUrls,
      ggCandidateUrls: enrichResult.bookingFields.ggCandidateUrls,
      ggValidatedUrl: enrichResult.bookingFields.ggValidatedUrl,
      ggValidationStatus: enrichResult.bookingFields.ggValidationStatus,
      ggResolverReason: gg.ggResolverReason,
    });
  }
  return { upserts: out, ggRun };
}
