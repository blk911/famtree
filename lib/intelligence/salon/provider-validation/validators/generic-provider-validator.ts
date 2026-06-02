// lib/intelligence/salon/provider-validation/validators/generic-provider-validator.ts

import {
  fetchPublicProviderUrl,
  scanMarkers,
  titleFromHtml,
} from "../fetch-public-url";
import type { SalonProviderCandidate, SalonProviderValidation } from "../types";

export type GenericValidatorConfig = {
  provider: string;
  providerLabel: string;
  hostPattern: RegExp;
  businessPathMinLength?: number;
  marketingPaths?: string[];
  positiveIds?: string[];
  hints?: { displayName?: string };
};

const DEFAULT_POSITIVE = [
  { id: "book", re: /\bbook\b/i },
  { id: "services", re: /\bservices\b/i },
  { id: "appointment", re: /\bappointment/i },
];

const DEFAULT_NEGATIVE = [
  { id: "pricing", re: /\bpricing\b/i },
  { id: "login", re: /\blogin\b/i },
  { id: "sign_up", re: /\bsign\s*up\b/i },
];

export async function validateGenericProviderCandidate(
  candidate: SalonProviderCandidate,
  config: GenericValidatorConfig,
): Promise<SalonProviderValidation> {
  const url = candidate.candidateUrl;
  const base = (): SalonProviderValidation => ({
    candidateId: candidate.id,
    prospectId: candidate.prospectId,
    provider: config.provider,
    providerLabel: config.providerLabel,
    candidateUrl: url,
    status: "candidate_only",
    confirmed: false,
    confidence: 0,
    positiveMarkers: [],
    negativeMarkers: [],
    reason: "",
    validatedAt: new Date().toISOString(),
    source: candidate.source,
    generated: candidate.generated,
  });

  if (!config.hostPattern.test(url)) {
    return { ...base(), status: "rejected_wrong_provider", reason: `Not a ${config.providerLabel} URL` };
  }

  let path = "/";
  try {
    path = new URL(url.startsWith("http") ? url : `https://${url}`).pathname;
  } catch {
    return { ...base(), status: "error", reason: "Invalid URL" };
  }

  const marketing = config.marketingPaths ?? ["/pricing", "/login", "/signup"];
  const pathLower = path.toLowerCase();
  if (marketing.some((m) => pathLower === m || pathLower.startsWith(`${m}/`))) {
    return { ...base(), status: "rejected_marketing_page", reason: "Marketing or auth page" };
  }

  const minLen = config.businessPathMinLength ?? 2;
  const hasProfilePath = path.length > minLen && path !== "/";

  const fetched = await fetchPublicProviderUrl(url);
  if (fetched.blocked) return { ...base(), status: "blocked", reason: "Blocked" };
  if (fetched.timedOut) return { ...base(), status: "timeout", reason: "Timed out" };
  if (fetched.fetchError) return { ...base(), status: "error", reason: "Fetch failed" };
  if (fetched.httpStatus === 404) {
    return { ...base(), status: "rejected_not_found", statusCode: 404, reason: "Not found" };
  }
  if (fetched.httpStatus < 200 || fetched.httpStatus >= 300) {
    return {
      ...base(),
      status: "rejected_not_found",
      statusCode: fetched.httpStatus,
      finalUrl: fetched.finalUrl,
      reason: `HTTP ${fetched.httpStatus}`,
    };
  }

  const title = titleFromHtml(fetched.body);
  const markers = scanMarkers(fetched.body, title, DEFAULT_POSITIVE, DEFAULT_NEGATIVE);

  if (markers.negative.some((n) => ["pricing", "login", "sign_up"].includes(n)) && !hasProfilePath) {
    return {
      ...base(),
      status: "rejected_marketing_page",
      finalUrl: fetched.finalUrl,
      statusCode: fetched.httpStatus,
      positiveMarkers: markers.positive,
      negativeMarkers: markers.negative,
      reason: "Generic provider marketing page",
    };
  }

  if (hasProfilePath && markers.positive.length >= 1) {
    return {
      ...base(),
      status: "confirmed",
      confirmed: true,
      confidence: candidate.generated ? 0.8 : 0.9,
      finalUrl: fetched.finalUrl,
      statusCode: fetched.httpStatus,
      positiveMarkers: markers.positive,
      negativeMarkers: markers.negative,
      reason: `${config.providerLabel} profile/booking page confirmed`,
    };
  }

  if (hasProfilePath && fetched.ok) {
    return {
      ...base(),
      status: "confirmed",
      confirmed: true,
      confidence: candidate.generated ? 0.75 : 0.85,
      finalUrl: fetched.finalUrl,
      statusCode: fetched.httpStatus,
      positiveMarkers: markers.positive,
      negativeMarkers: markers.negative,
      reason: `${config.providerLabel} business path with 2xx`,
    };
  }

  return {
    ...base(),
    status: "candidate_only",
    finalUrl: fetched.finalUrl,
    statusCode: fetched.httpStatus,
    positiveMarkers: markers.positive,
    negativeMarkers: markers.negative,
    reason: "Insufficient booking signals for generic provider",
  };
}
