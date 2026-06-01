// lib/intelligence/salon/booking-from-trail.ts
// Map IG prospect URL trails to persisted booking-provider fields.

import {
  confidenceToNumber,
  detectBestSalonBookingProvider,
  type SalonBookingProvider,
} from "./provider-detector";
import type { ProspectEvidence, ProspectRecord } from "@/lib/studios/prospects/types";

export type ProspectBookingFields = {
  bookingProvider?: string;
  bookingProviderLabel?: string;
  bookingUrl?: string;
  bookingProviderConfidence?: number;
  bookingProviderEvidence?: string[];
};

function evidenceToText(evidence: ProspectEvidence[] = []): string {
  return evidence
    .map((e) => (typeof e === "string" ? e : [e.label, e.url, e.type].filter(Boolean).join(" ")))
    .join(" ");
}

export function detectBookingFromProspectTrail(input: {
  bestMatchUrl?: string | null;
  allMatchedUrls?: Array<{ url: string } | string>;
  platforms?: string[];
  evidence?: ProspectEvidence[];
  linkTrailUrls?: string[];
}): ProspectBookingFields {
  const urls = [
    input.bestMatchUrl,
    ...(input.allMatchedUrls ?? []).map((u) => (typeof u === "string" ? u : u.url)),
    ...(input.platforms ?? []),
    ...(input.linkTrailUrls ?? []),
  ].filter((u): u is string => Boolean(u));

  const detection = detectBestSalonBookingProvider({
    urls,
    text: evidenceToText(input.evidence),
    linkPageLinks: input.linkTrailUrls,
  });

  if (!detection || detection.provider === "unknown") {
    return {};
  }

  return {
    bookingProvider: detection.provider,
    bookingProviderLabel: detection.providerLabel,
    bookingUrl: detection.bookingUrl,
    bookingProviderConfidence: confidenceToNumber(detection.confidence),
    bookingProviderEvidence: detection.evidence,
  };
}

/** Fill booking fields on a prospect when missing (read-time backfill). */
export function enrichProspectBookingIfMissing(record: ProspectRecord): ProspectRecord {
  if (record.bookingProvider && record.bookingProvider !== "unknown") {
    return record;
  }
  const detected = detectBookingFromProspectTrail({
    bestMatchUrl: record.bestMatch?.url,
    allMatchedUrls: record.allMatchedUrls,
    platforms: record.platforms,
    evidence: record.evidence,
  });
  if (!detected.bookingProvider) return record;
  return { ...record, ...detected };
}
