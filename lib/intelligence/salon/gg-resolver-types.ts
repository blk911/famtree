// lib/intelligence/salon/gg-resolver-types.ts

import type { GgValidationStatus } from "./glossgenius-page-validator";

export type { GgValidationStatus };

export type ProspectGgResolverStatus =
  | "not_attempted"
  | "skipped_existing_provider"
  | "skipped_no_handle"
  | "skipped_cap"
  | "attempted_not_found"
  | "found_handle"
  | "found_display"
  | "confirmed_client_page"
  | "candidate_only"
  | "generic_homepage"
  | "timeout"
  | "error";

export type GgResolverRunDiagnostics = {
  dedupedProspects: number;
  ggEligibleProspects: number;
  ggSkippedProviderAlreadyDetected: number;
  ggSkippedNoHandle: number;
  ggSkippedCap: number;
  ggAttemptedHandle: number;
  ggAttemptedDisplay: number;
  ggFoundHandle: number;
  ggFoundDisplay: number;
  ggNotFound: number;
  ggTimeout: number;
  ggError: number;
  ggCheckedUrlsCount: number;
  ggCandidatesTested: number;
  ggConfirmedClientPages: number;
  ggGenericHomepage: number;
  ggTimeouts: number;
};

export type GgCandidateDescriptor = {
  url: string;
  slug: string;
  source: "handle_derived" | "display_name_derived";
};

export type GgProbeLogEntry = {
  url: string;
  httpStatus: number;
  finalUrl: string;
  markersFound: string[];
  validationStatus?: GgValidationStatus;
  positiveMarkers?: string[];
  negativeMarkers?: string[];
  reason?: string;
  error?: "timeout" | "fetch_error" | "invalid_url";
};

export function emptyGgRunDiagnostics(): GgResolverRunDiagnostics {
  return {
    dedupedProspects: 0,
    ggEligibleProspects: 0,
    ggSkippedProviderAlreadyDetected: 0,
    ggSkippedNoHandle: 0,
    ggSkippedCap: 0,
    ggAttemptedHandle: 0,
    ggAttemptedDisplay: 0,
    ggFoundHandle: 0,
    ggFoundDisplay: 0,
    ggNotFound: 0,
    ggTimeout: 0,
    ggError: 0,
    ggCheckedUrlsCount: 0,
    ggCandidatesTested: 0,
    ggConfirmedClientPages: 0,
    ggGenericHomepage: 0,
    ggTimeouts: 0,
  };
}

export function mergeGgRunDiagnostics(
  target: GgResolverRunDiagnostics,
  delta: Partial<GgResolverRunDiagnostics>,
): void {
  for (const key of Object.keys(delta) as (keyof GgResolverRunDiagnostics)[]) {
    const v = delta[key];
    if (typeof v === "number") {
      target[key] = (target[key] ?? 0) + v;
    }
  }
}

export const DEFAULT_GG_RESOLVER_CAP = 250;
