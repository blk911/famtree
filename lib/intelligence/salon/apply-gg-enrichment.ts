// lib/intelligence/salon/apply-gg-enrichment.ts
// Salon GlossGenius resolver pass with per-prospect and run-level diagnostics.

import {
  detectBookingFromProspectTrail,
  type ProspectBookingFields,
} from "./booking-from-trail";
import { detectSalonBookingProvider } from "./provider-detector";
import {
  resolveGlossGeniusFromHandle,
  legacyGlossGeniusEnrichFields,
} from "./glossgenius-handle-resolver";
import type { EnrichedProspectBookingFields } from "./enrich-booking-provider";
import type { ProspectEvidence } from "@/lib/studios/prospects/types";
import type { UpsertInput } from "@/lib/studios/prospects/store";
import {
  DEFAULT_GG_RESOLVER_CAP,
  emptyGgRunDiagnostics,
  mergeGgRunDiagnostics,
  type GgResolverRunDiagnostics,
  type ProspectGgResolverStatus,
} from "./gg-resolver-types";

const SKIP_GG_CONFIDENCE = 90;

export type GgEnrichmentInput = {
  instagramHandle: string;
  displayName?: string | null;
  website?: string | null;
  bio?: string | null;
  bestMatchUrl?: string | null;
  allMatchedUrls?: Array<{ url: string } | string>;
  linkTrailUrls?: string[];
  linkTrailUrlsScanned?: string[];
  evidence?: ProspectEvidence[];
  bookingProvider?: string;
  bookingProviderConfidence?: number;
  bookingProviderSource?: string;
  bookingUrl?: string;
};

export type GgProspectDiagnostics = {
  ggResolverStatus: ProspectGgResolverStatus;
  ggCheckedUrls?: string[];
  ggResolverReason?: string;
};

export type ApplyGgOptions = {
  /** Index among deduped prospects (0-based) for cap enforcement */
  index: number;
  maxProbes?: number;
  /** When true, ignore cap and probe every eligible prospect */
  runGgOnAllDeduped?: boolean;
};

function trailUrlsFromInput(input: GgEnrichmentInput): string[] {
  const trail = input.linkTrailUrlsScanned ?? input.linkTrailUrls ?? [];
  return [
    input.bestMatchUrl,
    input.bookingUrl,
    ...(input.allMatchedUrls ?? []).map((u) => (typeof u === "string" ? u : u.url)),
    ...trail,
  ].filter((u): u is string => Boolean(u));
}

function existingBookingFields(input: GgEnrichmentInput): ProspectBookingFields {
  if (input.bookingProvider) {
    return {
      bookingProvider: input.bookingProvider,
      bookingProviderConfidence: input.bookingProviderConfidence,
      bookingUrl: input.bookingUrl,
      bookingProviderEvidence: [],
    };
  }
  return detectBookingFromProspectTrail(input);
}

function shouldSkipExistingProvider(
  fields: ProspectBookingFields,
  trailUrls: string[],
): boolean {
  if ((fields.bookingProviderConfidence ?? 0) >= SKIP_GG_CONFIDENCE) return true;
  if (
    fields.bookingProvider &&
    fields.bookingProvider !== "unknown" &&
    trailUrls.some((u) => detectSalonBookingProvider(u)?.provider === fields.bookingProvider)
  ) {
    return (fields.bookingProviderConfidence ?? 0) >= SKIP_GG_CONFIDENCE;
  }
  return false;
}

function hasGlossGeniusInTrail(urls: string[]): boolean {
  return urls.some((u) => detectSalonBookingProvider(u)?.provider === "glossgenius");
}

function mapGgResultToStatus(
  gg: Awaited<ReturnType<typeof resolveGlossGeniusFromHandle>>,
): ProspectGgResolverStatus {
  if (gg.found) {
    return gg.source === "display_name_derived" ? "found_display" : "found_handle";
  }
  if (gg.reason === "timeout") return "timeout";
  if (gg.reason === "error") return "error";
  if (gg.reason === "no_handle" || gg.reason === "no_candidates") return "skipped_no_handle";
  return "attempted_not_found";
}

function runDeltaForProspect(
  status: ProspectGgResolverStatus,
  source?: string,
  checkedCount = 0,
): Partial<GgResolverRunDiagnostics> {
  const d: Partial<GgResolverRunDiagnostics> = { ggCheckedUrlsCount: checkedCount };
  switch (status) {
    case "skipped_existing_provider":
      d.ggSkippedProviderAlreadyDetected = 1;
      break;
    case "skipped_no_handle":
      d.ggSkippedNoHandle = 1;
      break;
    case "skipped_cap":
      d.ggSkippedCap = 1;
      break;
    case "found_handle":
      d.ggFoundHandle = 1;
      d.ggAttemptedHandle = source === "display_name_derived" ? 0 : 1;
      if (source === "display_name_derived") d.ggAttemptedDisplay = 1;
      break;
    case "found_display":
      d.ggFoundDisplay = 1;
      d.ggAttemptedDisplay = 1;
      break;
    case "attempted_not_found":
      d.ggNotFound = 1;
      d.ggAttemptedHandle = 1;
      break;
    case "timeout":
      d.ggTimeout = 1;
      d.ggAttemptedHandle = 1;
      break;
    case "error":
      d.ggError = 1;
      d.ggAttemptedHandle = 1;
      break;
    default:
      break;
  }
  if (status === "found_handle" && source === "handle_derived") {
    d.ggAttemptedHandle = 1;
  }
  if (status === "attempted_not_found" || status === "timeout" || status === "error") {
    d.ggAttemptedHandle = 1;
  }
  return d;
}

/**
 * Run GlossGenius public URL probe for one prospect; returns booking field updates + diagnostics.
 */
export async function applyGgSalonEnrichment(
  input: GgEnrichmentInput,
  options: ApplyGgOptions,
): Promise<{
  bookingFields: EnrichedProspectBookingFields;
  gg: GgProspectDiagnostics;
  runDelta: Partial<GgResolverRunDiagnostics>;
}> {
  const maxProbes = options.runGgOnAllDeduped
    ? Number.MAX_SAFE_INTEGER
    : (options.maxProbes ?? DEFAULT_GG_RESOLVER_CAP);

  const handle = (input.instagramHandle ?? "").replace(/^@+/, "").trim();
  const trailUrls = trailUrlsFromInput(input);
  const trailFields = existingBookingFields(input);

  const emptyGg: GgProspectDiagnostics = {
    ggResolverStatus: "not_attempted",
  };

  if (!handle) {
    return {
      bookingFields: trailFields.bookingProvider ? { ...trailFields, bookingProviderSource: "unknown" } : {},
      gg: { ggResolverStatus: "skipped_no_handle", ggResolverReason: "no_instagram_handle" },
      runDelta: { ggSkippedNoHandle: 1 },
    };
  }

  if (shouldSkipExistingProvider(trailFields, trailUrls) || hasGlossGeniusInTrail(trailUrls)) {
    const src = input.bookingProviderSource ?? "direct_url";
    return {
      bookingFields: trailFields.bookingProvider
        ? { ...trailFields, bookingProviderSource: src as EnrichedProspectBookingFields["bookingProviderSource"] }
        : {},
      gg: {
        ggResolverStatus: "skipped_existing_provider",
        ggResolverReason: hasGlossGeniusInTrail(trailUrls)
          ? "glossgenius_already_in_trail"
          : "provider_already_detected",
        ggCheckedUrls: trailUrls.filter((u) => /glossgenius\.com/i.test(u)),
      },
      runDelta: { ggSkippedProviderAlreadyDetected: 1 },
    };
  }

  const eligibleDelta: Partial<GgResolverRunDiagnostics> = { ggEligibleProspects: 1 };

  if (!options.runGgOnAllDeduped && options.index >= maxProbes) {
    return {
      bookingFields: trailFields.bookingProvider ? { ...trailFields } : {},
      gg: {
        ggResolverStatus: "skipped_cap",
        ggResolverReason: `cap_exceeded_index_${options.index}_max_${maxProbes}`,
      },
      runDelta: { ...eligibleDelta, ggSkippedCap: 1 },
    };
  }

  const runDeltaBase: Partial<GgResolverRunDiagnostics> = { ...eligibleDelta };

  let ggResult;
  try {
    ggResult = await resolveGlossGeniusFromHandle(
      {
        instagramHandle: handle,
        displayName: input.displayName,
        website: input.website,
        bio: input.bio,
      },
      { publicUrls: trailUrls },
    );
  } catch (e) {
    const reason = e instanceof Error ? e.message : "resolver_error";
    return {
      bookingFields: trailFields.bookingProvider ? { ...trailFields } : {},
      gg: {
        ggResolverStatus: "error",
        ggResolverReason: reason,
      },
      runDelta: {
        ...runDeltaBase,
        ggError: 1,
        ggAttemptedHandle: 1,
        ggCheckedUrlsCount: 0,
      },
    };
  }

  const checkedUrls = ggResult.checkedUrls ?? [];
  const checkedCount = checkedUrls.length;
  const status = mapGgResultToStatus(ggResult);
  const prospectGg: GgProspectDiagnostics = {
    ggResolverStatus: status,
    ggCheckedUrls: checkedUrls,
    ggResolverReason: ggResult.reason ?? (ggResult.found ? "found" : "not_found"),
  };

  if (!ggResult.found) {
    const delta = {
      ...runDeltaBase,
      ...runDeltaForProspect(status, ggResult.source, checkedCount),
      ggCheckedUrlsCount: checkedCount,
    };
    if (status === "attempted_not_found") {
      delta.ggAttemptedHandle = 1;
      if (ggResult.candidates?.some((c) => c.source === "display_name_derived")) {
        delta.ggAttemptedDisplay = 1;
      }
    }
    return {
      bookingFields: trailFields.bookingProvider ? { ...trailFields } : {},
      gg: prospectGg,
      runDelta: delta,
    };
  }

  const gg = legacyGlossGeniusEnrichFields(ggResult);
  if (!gg) {
    return {
      bookingFields: trailFields.bookingProvider ? { ...trailFields } : {},
      gg: { ...prospectGg, ggResolverStatus: "attempted_not_found" },
      runDelta: {
        ...runDeltaBase,
        ggNotFound: 1,
        ggAttemptedHandle: 1,
        ggCheckedUrlsCount: checkedCount,
      },
    };
  }

  const delta = {
    ...runDeltaBase,
    ...runDeltaForProspect(status, gg.providerSource, checkedCount),
    ggCheckedUrlsCount: checkedCount,
  };
  if (gg.providerSource === "display_name_derived") {
    delta.ggAttemptedDisplay = 1;
    delta.ggFoundDisplay = 1;
  } else {
    delta.ggAttemptedHandle = 1;
    delta.ggFoundHandle = 1;
  }

  return {
    bookingFields: {
      bookingProvider: gg.provider,
      bookingProviderLabel: gg.providerLabel,
      bookingUrl: gg.bookingUrl,
      bookingProviderConfidence: gg.providerConfidence,
      bookingProviderEvidence: gg.evidence,
      bookingProviderSource: gg.providerSource,
    },
    gg: prospectGg,
    runDelta: delta,
  };
}

export function upsertInputToGgEnrichInput(upsert: UpsertInput): GgEnrichmentInput {
  return {
    instagramHandle: upsert.identity.handle,
    displayName: upsert.identity.name,
    website: upsert.bestMatch?.url,
    bio: (upsert.evidence ?? []).filter((e) => typeof e === "string").join(" "),
    bestMatchUrl: upsert.bestMatch?.url,
    allMatchedUrls: upsert.allMatchedUrls,
    linkTrailUrls: upsert.linkTrailUrlsScanned,
    linkTrailUrlsScanned: upsert.linkTrailUrlsScanned,
    evidence: upsert.evidence,
    bookingProvider: upsert.bookingProvider,
    bookingProviderConfidence: upsert.bookingProviderConfidence,
    bookingProviderSource: upsert.bookingProviderSource,
    bookingUrl: upsert.bookingUrl,
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
