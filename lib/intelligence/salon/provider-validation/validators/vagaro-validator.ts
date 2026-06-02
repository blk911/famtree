// lib/intelligence/salon/provider-validation/validators/vagaro-validator.ts

import {
  fetchPublicProviderUrl,
  scanMarkers,
  titleFromHtml,
} from "../fetch-public-url";
import type { SalonProviderCandidate, SalonProviderValidation } from "../types";

const POSITIVE = [
  { id: "book", re: /\bbook\b/i },
  { id: "services", re: /\bservices\b/i },
  { id: "staff", re: /\bstaff\b/i },
  { id: "classes", re: /\bclasses\b/i },
  { id: "appointment", re: /\bappointment/i },
  { id: "business", re: /\bbusiness\b/i },
];

const NEGATIVE = [
  { id: "pricing", re: /\bpricing\b/i },
  { id: "learn", re: /\blearn\b/i },
  { id: "features", re: /\bfeatures\b/i },
  { id: "sign_up", re: /\bsign\s*up\b/i },
  { id: "login", re: /\blogin\b/i },
  { id: "free_trial", re: /free\s+trial/i },
];

const MARKETING_PATHS = ["/pricing", "/learn", "/features", "/signup", "/sign-up", "/login"];

function isVagaroBusinessPath(pathname: string): boolean {
  const p = pathname.toLowerCase();
  if (p === "/" || p === "") return false;
  if (MARKETING_PATHS.some((m) => p === m || p.startsWith(`${m}/`))) return false;
  return p.length > 1;
}

export async function validateVagaroCandidate(
  candidate: SalonProviderCandidate,
): Promise<SalonProviderValidation> {
  const url = candidate.candidateUrl;
  const base = (): SalonProviderValidation => ({
    candidateId: candidate.id,
    prospectId: candidate.prospectId,
    provider: "vagaro",
    providerLabel: "Vagaro",
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

  if (!/vagaro\.com/i.test(url)) {
    return { ...base(), status: "rejected_wrong_provider", reason: "Not a Vagaro URL" };
  }

  let host = "";
  let path = "/";
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    host = u.hostname.toLowerCase();
    path = u.pathname;
  } catch {
    return { ...base(), status: "error", reason: "Invalid URL" };
  }

  if (host === "vagaro.com" || host === "www.vagaro.com") {
    if (MARKETING_PATHS.some((m) => path.toLowerCase().startsWith(m))) {
      return {
        ...base(),
        status: "rejected_marketing_page",
        reason: "Vagaro marketing/pricing page",
      };
    }
    if (!isVagaroBusinessPath(path)) {
      return {
        ...base(),
        status: "rejected_generic_homepage",
        reason: "Vagaro homepage — not a business profile",
      };
    }
  }

  const fetched = await fetchPublicProviderUrl(url);
  if (fetched.blocked) {
    return { ...base(), status: "blocked", reason: "Blocked by host", statusCode: fetched.httpStatus };
  }
  if (fetched.timedOut) {
    return { ...base(), status: "timeout", reason: "Request timed out" };
  }
  if (fetched.fetchError) {
    return { ...base(), status: "error", reason: "Fetch failed" };
  }
  if (fetched.httpStatus === 404) {
    return { ...base(), status: "rejected_not_found", reason: "Page not found", statusCode: 404 };
  }
  if (fetched.httpStatus < 200 || fetched.httpStatus >= 300) {
    return {
      ...base(),
      status: "rejected_not_found",
      reason: `HTTP ${fetched.httpStatus}`,
      statusCode: fetched.httpStatus,
      finalUrl: fetched.finalUrl,
    };
  }

  const title = titleFromHtml(fetched.body);
  const markers = scanMarkers(fetched.body, title, POSITIVE, NEGATIVE);

  try {
    const final = new URL(fetched.finalUrl);
    if (
      (final.hostname === "vagaro.com" || final.hostname === "www.vagaro.com") &&
      !isVagaroBusinessPath(final.pathname)
    ) {
      return {
        ...base(),
        status: "rejected_redirect_home",
        finalUrl: fetched.finalUrl,
        reason: "Redirected to Vagaro homepage",
        statusCode: fetched.httpStatus,
        negativeMarkers: markers.negative,
      };
    }
  } catch {
    // ignore
  }

  if (markers.negative.some((n) => ["pricing", "learn", "features", "login", "sign_up"].includes(n))) {
    return {
      ...base(),
      status: "rejected_marketing_page",
      finalUrl: fetched.finalUrl,
      statusCode: fetched.httpStatus,
      positiveMarkers: markers.positive,
      negativeMarkers: markers.negative,
      reason: "Vagaro marketing or auth page",
    };
  }

  const hasBusinessPath = isVagaroBusinessPath(path) || isVagaroBusinessPath(new URL(fetched.finalUrl).pathname);
  const bookingSignals = markers.positive.filter((p) =>
    ["book", "services", "appointment", "staff"].includes(p),
  ).length;

  if (hasBusinessPath && (bookingSignals >= 1 || markers.positive.length >= 2)) {
    const conf = candidate.generated ? 0.82 : 0.92;
    return {
      ...base(),
      status: "confirmed",
      confirmed: true,
      confidence: conf,
      finalUrl: fetched.finalUrl,
      statusCode: fetched.httpStatus,
      positiveMarkers: markers.positive,
      negativeMarkers: markers.negative,
      reason: "Vagaro business/booking page confirmed",
    };
  }

  if (hasBusinessPath && fetched.ok) {
    return {
      ...base(),
      status: "confirmed",
      confirmed: true,
      confidence: candidate.generated ? 0.78 : 0.85,
      finalUrl: fetched.finalUrl,
      statusCode: fetched.httpStatus,
      positiveMarkers: markers.positive,
      negativeMarkers: markers.negative,
      reason: "Vagaro profile path with 2xx response",
    };
  }

  return {
    ...base(),
    status: "candidate_only",
    finalUrl: fetched.finalUrl,
    statusCode: fetched.httpStatus,
    positiveMarkers: markers.positive,
    negativeMarkers: markers.negative,
    reason: "Insufficient Vagaro booking signals",
  };
}
