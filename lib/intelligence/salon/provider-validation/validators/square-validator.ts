// lib/intelligence/salon/provider-validation/validators/square-validator.ts

import {
  fetchPublicProviderUrl,
  scanMarkers,
  titleFromHtml,
} from "../fetch-public-url";
import type { SalonProviderCandidate, SalonProviderValidation } from "../types";

const BOOKING_POSITIVE = [
  { id: "book", re: /\bbook\b/i },
  { id: "appointment", re: /\bappointment/i },
  { id: "services", re: /\bservices\b/i },
  { id: "schedule", re: /\bschedule\b/i },
  { id: "select_time", re: /select\s+(?:a\s+)?time/i },
];

const MARKETING_NEGATIVE = [
  { id: "pricing", re: /\bpricing\b/i },
  { id: "payments_plans", re: /payment\s+processing/i },
  { id: "point_of_sale", re: /point\s+of\s+sale/i },
];

export type SquareValidationMode = "booking" | "payment_only";

function classifySquareUrl(url: string): {
  mode: SquareValidationMode;
  isBookingHost: boolean;
} {
  const lower = url.toLowerCase();
  if (/squareup\.com\/[^/]*\/[^/]*\/pricing/i.test(lower) || /squareup\.com\/.*\/pricing/i.test(lower)) {
    return { mode: "payment_only", isBookingHost: false };
  }
  if (/\/pricing(?:\/|$|\?)/i.test(lower)) {
    return { mode: "payment_only", isBookingHost: false };
  }
  if (
    /book\.squareup\.com/i.test(lower) ||
    /booking\.squareup\.com/i.test(lower) ||
    /squareup\.com\/appointments/i.test(lower) ||
    /square\.site\/book/i.test(lower) ||
    /checkout\.square\.site/i.test(lower)
  ) {
    return { mode: "booking", isBookingHost: true };
  }
  if (/square\.site/i.test(lower) && !/\/pricing/i.test(lower)) {
    return { mode: "booking", isBookingHost: true };
  }
  if (/squareup\.com/i.test(lower)) {
    return { mode: "payment_only", isBookingHost: false };
  }
  return { mode: "booking", isBookingHost: false };
}

export async function validateSquareCandidate(
  candidate: SalonProviderCandidate,
): Promise<SalonProviderValidation & { paymentOnly?: boolean }> {
  const url = candidate.candidateUrl;
  const base = (): SalonProviderValidation => ({
    candidateId: candidate.id,
    prospectId: candidate.prospectId,
    provider: "square",
    providerLabel: "Square Appointments",
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

  const { mode, isBookingHost } = classifySquareUrl(url);

  if (mode === "payment_only") {
    return {
      ...base(),
      providerLabel: "Square",
      status: "rejected_marketing_page",
      reason: "Square pricing/payments page — not a booking provider",
      paymentOnly: true,
    };
  }

  if (!/square(up)?\.com|square\.site/i.test(url)) {
    return { ...base(), status: "rejected_wrong_provider", reason: "Not a Square URL" };
  }

  if (!isBookingHost && !/appointments|\/book/i.test(url)) {
    return {
      ...base(),
      status: "candidate_only",
      reason: "Square URL without clear appointment/booking path",
    };
  }

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
  const markers = scanMarkers(fetched.body, title, BOOKING_POSITIVE, MARKETING_NEGATIVE);
  const finalLower = fetched.finalUrl.toLowerCase();

  if (/\/pricing(?:\/|$|\?)/i.test(finalLower) && !/book\.|booking\.|appointments/i.test(finalLower)) {
    return {
      ...base(),
      providerLabel: "Square",
      status: "rejected_marketing_page",
      finalUrl: fetched.finalUrl,
      statusCode: fetched.httpStatus,
      negativeMarkers: markers.negative,
      reason: "Redirected to Square pricing — payment signal only",
      paymentOnly: true,
    };
  }

  const bookingMarkers = markers.positive.length;
  if (isBookingHost || /appointments|\/book/i.test(finalLower)) {
    const conf = bookingMarkers >= 2 ? 0.95 : bookingMarkers >= 1 ? 0.88 : 0.82;
    return {
      ...base(),
      status: "confirmed",
      confirmed: true,
      confidence: candidate.generated ? conf - 0.05 : conf,
      finalUrl: fetched.finalUrl,
      statusCode: fetched.httpStatus,
      positiveMarkers: markers.positive,
      negativeMarkers: markers.negative,
      reason: "Square Appointments booking page confirmed",
    };
  }

  return {
    ...base(),
    status: "candidate_only",
    finalUrl: fetched.finalUrl,
    statusCode: fetched.httpStatus,
    positiveMarkers: markers.positive,
    negativeMarkers: markers.negative,
    reason: "Square URL lacks booking confirmation",
  };
}
