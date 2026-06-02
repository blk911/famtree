// lib/intelligence/salon/provider-validation/validators/glossgenius-validator.ts

import {
  classifyGgPageContent,
  fetchGgPage,
  type GgValidationSource,
} from "../../glossgenius-page-validator";
import { glossGeniusSlugFromUrl, isGgApexHost, isGgClientSubdomainUrl } from "../../glossgenius-url";
import type {
  SalonProviderCandidate,
  SalonProviderValidation,
  SalonProviderValidationStatus,
} from "../types";

function mapGgStatus(status: string): SalonProviderValidationStatus {
  switch (status) {
    case "confirmed_client_page":
      return "confirmed";
    case "generic_glossgenius_page":
      return "rejected_generic_homepage";
    case "redirect_home":
      return "rejected_redirect_home";
    case "not_found":
      return "rejected_not_found";
    case "blocked":
      return "blocked";
    case "timeout":
      return "timeout";
    case "error":
      return "error";
    case "candidate_only":
    default:
      return "candidate_only";
  }
}

function mapSource(source?: SalonProviderCandidate["source"]): GgValidationSource {
  if (!source) return "direct_url";
  if (source === "handle_guess") return "handle_derived";
  if (source === "display_guess") return "display_name_derived";
  if (source === "link_in_bio") return "link_in_bio";
  return "direct_url";
}

export async function validateGlossGeniusCandidate(
  candidate: SalonProviderCandidate,
  hints: { handle?: string; displayName?: string },
): Promise<SalonProviderValidation> {
  const url = candidate.candidateUrl;
  const slugHint = glossGeniusSlugFromUrl(url);

  if (!/glossgenius\.com/i.test(url)) {
    return baseResult(candidate, {
      status: "rejected_wrong_provider",
      confirmed: false,
      confidence: 0,
      reason: "URL is not a GlossGenius host",
    });
  }

  if (!isGgClientSubdomainUrl(url)) {
    try {
      const u = new URL(url.startsWith("http") ? url : `https://${url}`);
      if (isGgApexHost(u.hostname)) {
        const path = u.pathname.toLowerCase();
        if (path.includes("pricing") || path.includes("plans")) {
          return baseResult(candidate, {
            status: "rejected_marketing_page",
            confirmed: false,
            confidence: 0,
            reason: "GlossGenius marketing/pricing page",
            candidateUrl: url,
          });
        }
        return baseResult(candidate, {
          status: "rejected_generic_homepage",
          confirmed: false,
          confidence: 0,
          reason: "GlossGenius apex homepage — not a client booking page",
        });
      }
    } catch {
      // fall through
    }
    return baseResult(candidate, {
      status: "candidate_only",
      confirmed: false,
      confidence: 0,
      reason: "Not a GlossGenius client subdomain",
    });
  }

  const ggSource = mapSource(candidate.source);
  const fetched = await fetchGgPage(url.startsWith("https") ? url : `https://${url}`);
  const classified = classifyGgPageContent({
    httpStatus: fetched.httpStatus,
    finalUrl: fetched.finalUrl,
    body: fetched.body,
    timedOut: fetched.timedOut,
    fetchError: fetched.fetchError,
    requestedUrl: url,
    slugHint: slugHint ?? undefined,
    displayNameHint: hints.displayName,
    handleHint: hints.handle,
    discoverySource: ggSource,
  });

  let status = mapGgStatus(classified.status);
  let confirmed = classified.confirmed;
  let confidence = classified.suggestedConfidence / 100;
  let reason = classified.reason;

  if (confirmed && classified.positiveMarkers.length === 0 && !classified.negativeMarkers.length) {
    confirmed = true;
    confidence = Math.max(confidence, 0.8);
    reason = "GlossGenius subdomain resolved to non-generic client page.";
  }

  if (status === "rejected_generic_homepage" && /pricing|plans/i.test(url)) {
    status = "rejected_marketing_page";
    reason = "GlossGenius marketing/pricing page";
  }

  return {
    candidateId: candidate.id,
    prospectId: candidate.prospectId,
    provider: "glossgenius",
    providerLabel: "GlossGenius",
    candidateUrl: url,
    finalUrl: classified.finalUrl,
    status,
    confirmed,
    confidence,
    statusCode: classified.httpStatus,
    positiveMarkers: classified.positiveMarkers,
    negativeMarkers: classified.negativeMarkers,
    reason,
    validatedAt: new Date().toISOString(),
    source: candidate.source,
    generated: candidate.generated,
  };
}

function baseResult(
  candidate: SalonProviderCandidate,
  patch: Partial<SalonProviderValidation>,
): SalonProviderValidation {
  return {
    candidateId: candidate.id,
    prospectId: candidate.prospectId,
    provider: "glossgenius",
    providerLabel: "GlossGenius",
    candidateUrl: candidate.candidateUrl,
    status: "candidate_only",
    confirmed: false,
    confidence: 0,
    positiveMarkers: [],
    negativeMarkers: [],
    reason: "",
    validatedAt: new Date().toISOString(),
    source: candidate.source,
    generated: candidate.generated,
    ...patch,
  };
}
