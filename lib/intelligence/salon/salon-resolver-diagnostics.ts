// lib/intelligence/salon/salon-resolver-diagnostics.ts
// Aggregate resolver / provider metrics for harvest runs and admin cards.

import type { UpsertInput } from "@/lib/studios/prospects/store";
import { isSalonImportCandidate } from "./import-candidate";
import { isConfirmedSalonBookingProvider } from "./gg-booking-display";
import { glossGeniusResolverStatus } from "./enrich-booking-provider";
import type { ProspectRecord } from "@/lib/studios/prospects/types";
import { emptyGgRunDiagnostics, type GgResolverRunDiagnostics } from "./gg-resolver-types";

export type SalonResolverRunDiagnostics = {
  harvested?: number;
  deduped?: number;
  resolved?: number;
  providerFound?: number;
  ggDirect?: number;
  ggLinkInBio?: number;
  ggHandleMatch?: number;
  ggDisplayMatch?: number;
  importCandidates?: number;
  unknown?: number;
} & Partial<GgResolverRunDiagnostics>;

export function emptySalonResolverDiagnostics(): SalonResolverRunDiagnostics {
  return {
    harvested: 0,
    deduped: 0,
    resolved: 0,
    providerFound: 0,
    ggDirect: 0,
    ggLinkInBio: 0,
    ggHandleMatch: 0,
    ggDisplayMatch: 0,
    importCandidates: 0,
    unknown: 0,
  };
}

function trailUrlsFromUpsert(input: UpsertInput): string[] {
  return [
    input.bookingUrl,
    input.bestMatch?.url,
    ...(input.allMatchedUrls ?? []).map((m) => m.url),
    ...(input.linkTrailUrlsScanned ?? []),
  ].filter((u): u is string => Boolean(u));
}

export function tallySalonResolverUpsert(
  diag: SalonResolverRunDiagnostics,
  upsert: UpsertInput,
  resolved: boolean,
): void {
  if (resolved) diag.resolved = (diag.resolved ?? 0) + 1;

  const pseudoForConfirm = {
    bookingProvider: upsert.bookingProvider,
    ggValidationStatus: upsert.ggValidationStatus,
  };
  const provider = upsert.bookingProvider;
  if (
    provider &&
    provider !== "unknown" &&
    isConfirmedSalonBookingProvider(pseudoForConfirm)
  ) {
    diag.providerFound = (diag.providerFound ?? 0) + 1;
    const trails = trailUrlsFromUpsert(upsert);
    const src = upsert.bookingProviderSource;
    if (provider === "glossgenius") {
      const normalizedSrc =
        src === "link_trail" ? "link_in_bio" : src;
      const ggStatus = glossGeniusResolverStatus(
        {
          bookingProvider: provider,
          bookingProviderSource: normalizedSrc as import("./enrich-booking-provider").BookingProviderSource,
          bookingUrl: upsert.bookingUrl,
        },
        trails,
      );
      if (ggStatus === "gg_direct") diag.ggDirect = (diag.ggDirect ?? 0) + 1;
      else if (ggStatus === "gg_link_in_bio") diag.ggLinkInBio = (diag.ggLinkInBio ?? 0) + 1;
      else if (ggStatus === "gg_handle_match") diag.ggHandleMatch = (diag.ggHandleMatch ?? 0) + 1;
      else if (ggStatus === "gg_display_match") diag.ggDisplayMatch = (diag.ggDisplayMatch ?? 0) + 1;
    }
    const pseudo = {
      ...upsert,
      prospectId: "",
      identityFingerprint: "",
      createdAt: "",
      updatedAt: "",
      validationStatus: "new" as const,
      archiveReason: null,
      status: "new" as const,
      notes: "",
      source: upsert.source ?? { sourceType: "hashtag_harvest", batchId: "", sourceHandle: "", sourceDisplayName: "" },
      identity: upsert.identity,
      confidence: upsert.confidence,
      evidence: upsert.evidence ?? [],
      allMatchedUrls: upsert.allMatchedUrls ?? [],
      platforms: upsert.platforms ?? [],
      services: upsert.services ?? [],
      bestMatch: upsert.bestMatch ?? null,
    } as ProspectRecord;
    if (isSalonImportCandidate(pseudo)) {
      diag.importCandidates = (diag.importCandidates ?? 0) + 1;
    }
  } else {
    diag.unknown = (diag.unknown ?? 0) + 1;
  }
}

/** Roll up per-prospect GG fields for compact admin views. */
export function tallyGgFromProspects(
  prospects: Array<{
    ggResolverStatus?: string;
    ggCheckedUrls?: string[];
  }>,
): GgResolverRunDiagnostics {
  const d = emptyGgRunDiagnostics();
  d.dedupedProspects = prospects.length;
  for (const p of prospects) {
    const urls = p.ggCheckedUrls?.length ?? 0;
    d.ggCheckedUrlsCount += urls;
    switch (p.ggResolverStatus) {
      case "skipped_existing_provider":
        d.ggSkippedProviderAlreadyDetected++;
        d.ggEligibleProspects++;
        break;
      case "skipped_no_handle":
        d.ggSkippedNoHandle++;
        break;
      case "skipped_cap":
        d.ggSkippedCap++;
        d.ggEligibleProspects++;
        break;
      case "found_handle":
        d.ggFoundHandle++;
        d.ggAttemptedHandle++;
        d.ggEligibleProspects++;
        break;
      case "found_display":
        d.ggFoundDisplay++;
        d.ggAttemptedDisplay++;
        d.ggEligibleProspects++;
        break;
      case "attempted_not_found":
        d.ggNotFound++;
        d.ggAttemptedHandle++;
        d.ggEligibleProspects++;
        break;
      case "timeout":
        d.ggTimeout++;
        d.ggAttemptedHandle++;
        d.ggEligibleProspects++;
        break;
      case "error":
        d.ggError++;
        d.ggAttemptedHandle++;
        d.ggEligibleProspects++;
        break;
      default:
        break;
    }
  }
  return d;
}
