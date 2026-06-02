// lib/intelligence/salon/business-stack/glossgenius-stack.ts

import {
  validateGlossGeniusPage,
  mapValidationSource,
  type GgValidationStatus,
} from "../glossgenius-page-validator";
import {
  extractGlossGeniusUrlsFromText,
  isGgClientSubdomainUrl,
} from "../glossgenius-url";
import type { BookingProviderSource } from "../enrich-booking-provider";
import type { SalonStackSignal, SalonStackSignalSource } from "./types";
import { mergeStackSignals } from "./fingerprint-detector";

export type GgStackDetectStats = {
  ggLinksSeen: number;
  ggClientPagesConfirmed: number;
  ggGenericRejected: number;
};

export type GgBookingFromStack = {
  bookingProvider: "glossgenius";
  bookingProviderLabel: "GlossGenius";
  bookingUrl: string;
  bookingProviderConfidence: number;
  bookingProviderEvidence: string[];
  bookingProviderSource: BookingProviderSource;
  ggValidationStatus: GgValidationStatus;
};

function mapStackSourceToGg(source: SalonStackSignalSource): BookingProviderSource {
  if (source === "link_in_bio") return "link_in_bio";
  if (source === "website_link" || source === "website_html") return "website_crawl";
  return "direct_url";
}

export async function detectValidatedGlossGeniusStackSignals(input: {
  urls: string[];
  source: SalonStackSignalSource;
  handleHint?: string;
  displayNameHint?: string;
  stats?: GgStackDetectStats;
}): Promise<SalonStackSignal[]> {
  const now = new Date().toISOString();
  const signals: SalonStackSignal[] = [];
  const stats = input.stats;
  const ggUrls = new Set<string>();

  for (const raw of input.urls) {
    if (!raw?.startsWith("http")) continue;
    if (isGgClientSubdomainUrl(raw)) ggUrls.add(raw.replace(/\/+$/, "") || raw);
  }
  for (const u of extractGlossGeniusUrlsFromText(input.urls.join(" "))) {
    ggUrls.add(u);
  }

  if (stats) stats.ggLinksSeen += ggUrls.size;

  for (const url of Array.from(ggUrls)) {
    const validation = await validateGlossGeniusPage({
      url,
      slugHint: url,
      handleHint: input.handleHint,
      displayNameHint: input.displayNameHint,
      discoverySource: mapValidationSource(mapStackSourceToGg(input.source)),
    });

    if (validation.confirmed) {
      if (stats) stats.ggClientPagesConfirmed++;
      const conf = Math.max(0.85, validation.suggestedConfidence / 100);
      signals.push({
        providerId: "glossgenius",
        providerLabel: "GlossGenius",
        category: "booking",
        source: input.source,
        url: validation.finalUrl,
        confidence: Math.round(conf * 1000) / 1000,
        evidence: [
          "Confirmed GlossGenius subdomain client page",
          validation.reason,
          ...validation.positiveMarkers.slice(0, 4).map((m) => `marker:${m}`),
        ],
        detectedAt: now,
      });
    } else if (stats) {
      stats.ggGenericRejected++;
    }
  }

  return mergeStackSignals(signals);
}

export function bookingUpgradeFromGgStack(
  stack: { signals: SalonStackSignal[]; primaryBookingProvider?: string },
  existing?: {
    bookingProvider?: string;
    bookingProviderConfidence?: number;
    bookingProviderSource?: string;
  },
): GgBookingFromStack | null {
  if (stack.primaryBookingProvider !== "glossgenius") {
    const sig = stack.signals.find(
      (s) => s.providerId === "glossgenius" && s.category === "booking",
    );
    if (!sig) return null;
    const conf = Math.round(sig.confidence * 100);
    if (
      existing?.bookingProvider === "glossgenius" &&
      (existing.bookingProviderConfidence ?? 0) >= conf
    ) {
      return null;
    }
    return {
      bookingProvider: "glossgenius",
      bookingProviderLabel: "GlossGenius",
      bookingUrl: sig.url ?? "",
      bookingProviderConfidence: conf,
      bookingProviderEvidence: [
        ...(existing?.bookingProviderSource ? [] : []),
        "Confirmed GlossGenius subdomain client page",
        ...sig.evidence,
      ].slice(0, 12),
      bookingProviderSource: mapStackSourceToGg(sig.source),
      ggValidationStatus: "confirmed_client_page",
    };
  }

  const sig = stack.signals.find(
    (s) => s.providerId === "glossgenius" && s.category === "booking",
  );
  if (!sig?.url) return null;

  const conf = Math.round(sig.confidence * 100);
  const protectedDirect =
    (existing?.bookingProviderConfidence ?? 0) >= 90 &&
    (existing?.bookingProviderSource === "direct_url" ||
      existing?.bookingProviderSource === "link_in_bio" ||
      existing?.bookingProviderSource === "link_trail") &&
    existing?.bookingProvider &&
    existing.bookingProvider !== "unknown";

  if (protectedDirect && conf <= (existing.bookingProviderConfidence ?? 0)) {
    return null;
  }

  if (
    existing?.bookingProvider &&
    existing.bookingProvider !== "unknown" &&
    existing.bookingProvider !== "glossgenius" &&
    (existing.bookingProviderConfidence ?? 0) >= conf
  ) {
    return null;
  }

  return {
    bookingProvider: "glossgenius",
    bookingProviderLabel: "GlossGenius",
    bookingUrl: sig.url,
    bookingProviderConfidence: conf,
    bookingProviderEvidence: [
      "Confirmed GlossGenius subdomain client page",
      ...sig.evidence,
    ].slice(0, 12),
    bookingProviderSource: mapStackSourceToGg(sig.source),
    ggValidationStatus: "confirmed_client_page",
  };
}
