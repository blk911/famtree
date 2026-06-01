// lib/intelligence/salon/enrich-booking-provider.ts
// Booking provider enrichment: public URL trail first, then GlossGenius handle/display resolver.

import {
  detectBookingFromProspectTrail,
  type ProspectBookingFields,
} from "./booking-from-trail";
import { detectSalonBookingProvider } from "./provider-detector";
import {
  resolveGlossGeniusFromHandle,
  legacyGlossGeniusEnrichFields,
} from "./glossgenius-handle-resolver";
import type { ProspectEvidence } from "@/lib/studios/prospects/types";

export type BookingProviderSource =
  | "direct_url"
  | "link_in_bio"
  | "handle_derived"
  | "display_name_derived"
  | "unknown";

export type EnrichedProspectBookingFields = ProspectBookingFields & {
  bookingProviderSource?: BookingProviderSource;
};

const SKIP_GG_CONFIDENCE = 90;

export type GlossGeniusResolverStatus =
  | "gg_direct"
  | "gg_link_in_bio"
  | "gg_handle_match"
  | "gg_display_match"
  | "gg_not_found";

export const GLOSSGENIUS_RESOLVER_STATUS_LABELS: Record<GlossGeniusResolverStatus, string> = {
  gg_direct: "GG Direct",
  gg_link_in_bio: "GG Link-in-Bio",
  gg_handle_match: "GG Handle Match",
  gg_display_match: "GG Display Match",
  gg_not_found: "GG Not Found",
};

export function glossGeniusResolverStatus(
  fields: EnrichedProspectBookingFields,
  trailUrls: string[] = [],
): GlossGeniusResolverStatus {
  if (fields.bookingProvider !== "glossgenius") return "gg_not_found";
  if (fields.bookingProviderSource === "handle_derived") return "gg_handle_match";
  if (fields.bookingProviderSource === "display_name_derived") return "gg_display_match";
  if (fields.bookingProviderSource === "link_in_bio") return "gg_link_in_bio";

  if (fields.bookingUrl && /glossgenius\.com/i.test(fields.bookingUrl)) {
    return "gg_direct";
  }

  for (const url of trailUrls) {
    if (/glossgenius\.com/i.test(url)) return "gg_direct";
  }

  return "gg_not_found";
}

function trailUrlsFromInput(input: {
  bestMatchUrl?: string | null;
  allMatchedUrls?: Array<{ url: string } | string>;
  linkTrailUrls?: string[];
  linkTrailUrlsScanned?: string[];
}): string[] {
  const trail = input.linkTrailUrlsScanned ?? input.linkTrailUrls ?? [];
  return [
    input.bestMatchUrl,
    ...(input.allMatchedUrls ?? []).map((u) => (typeof u === "string" ? u : u.url)),
    ...trail,
  ].filter((u): u is string => Boolean(u));
}

function isLinkAggregator(url: string): boolean {
  const hay = url.toLowerCase();
  return (
    hay.includes("linktr.ee") ||
    hay.includes("beacons.ai") ||
    hay.includes("stan.store") ||
    hay.includes("hoo.be") ||
    hay.includes("lnk.bio")
  );
}

function inferTrailSource(
  trailFields: ProspectBookingFields,
  urls: string[],
): BookingProviderSource {
  const bookingUrl = trailFields.bookingUrl;
  if (
    bookingUrl &&
    detectSalonBookingProvider(bookingUrl)?.provider === trailFields.bookingProvider
  ) {
    return "direct_url";
  }
  for (const url of urls) {
    const hit = detectSalonBookingProvider(url);
    if (hit?.provider === trailFields.bookingProvider) {
      return isLinkAggregator(url) ? "link_in_bio" : "direct_url";
    }
  }
  if (urls.some(isLinkAggregator)) return "link_in_bio";
  return "direct_url";
}

function hasGlossGeniusInTrail(urls: string[]): boolean {
  return urls.some((u) => detectSalonBookingProvider(u)?.provider === "glossgenius");
}

function shouldSkipGgProbe(existing?: ProspectBookingFields): boolean {
  return (existing?.bookingProviderConfidence ?? 0) >= SKIP_GG_CONFIDENCE;
}

/**
 * Detect booking provider from URL trails, then optionally probe GlossGenius subdomains.
 */
export async function enrichSalonBookingProvider(
  input: {
    bestMatchUrl?: string | null;
    allMatchedUrls?: Array<{ url: string } | string>;
    platforms?: string[];
    evidence?: ProspectEvidence[];
    linkTrailUrls?: string[];
    linkTrailUrlsScanned?: string[];
    instagramHandle: string;
    displayName?: string | null;
    website?: string | null;
    bio?: string | null;
  },
  options?: { enableHandleDerivedGlossGenius?: boolean },
): Promise<EnrichedProspectBookingFields> {
  const trailUrls = trailUrlsFromInput(input);
  const trailFields = detectBookingFromProspectTrail(input);

  if (trailFields.bookingProvider) {
    const enriched: EnrichedProspectBookingFields = {
      ...trailFields,
      bookingProviderSource: inferTrailSource(trailFields, trailUrls),
    };
    if (shouldSkipGgProbe(enriched) || options?.enableHandleDerivedGlossGenius === false) {
      return enriched;
    }
    if (hasGlossGeniusInTrail(trailUrls)) return enriched;
    // High-confidence non-GG provider — do not override with GG probe
    if ((enriched.bookingProviderConfidence ?? 0) >= SKIP_GG_CONFIDENCE) {
      return enriched;
    }
  }

  if (options?.enableHandleDerivedGlossGenius === false) {
    return trailFields.bookingProvider ? { ...trailFields, bookingProviderSource: inferTrailSource(trailFields, trailUrls) } : {};
  }

  if (hasGlossGeniusInTrail(trailUrls)) {
    return trailFields.bookingProvider
      ? { ...trailFields, bookingProviderSource: inferTrailSource(trailFields, trailUrls) }
      : {};
  }

  if (shouldSkipGgProbe(trailFields)) {
    return trailFields.bookingProvider
      ? { ...trailFields, bookingProviderSource: inferTrailSource(trailFields, trailUrls) }
      : {};
  }

  let ggResult;
  try {
    ggResult = await resolveGlossGeniusFromHandle(
      {
        instagramHandle: input.instagramHandle,
        displayName: input.displayName,
        website: input.website,
        bio: input.bio,
      },
      { publicUrls: trailUrls },
    );
  } catch {
    return trailFields.bookingProvider
      ? { ...trailFields, bookingProviderSource: inferTrailSource(trailFields, trailUrls) }
      : {};
  }

  if (!ggResult.found) {
    return trailFields.bookingProvider
      ? { ...trailFields, bookingProviderSource: inferTrailSource(trailFields, trailUrls) }
      : {};
  }

  const gg = legacyGlossGeniusEnrichFields(ggResult);
  if (!gg) {
    return trailFields.bookingProvider
      ? { ...trailFields, bookingProviderSource: inferTrailSource(trailFields, trailUrls) }
      : {};
  }

  if (trailFields.bookingProvider && (trailFields.bookingProviderConfidence ?? 0) >= SKIP_GG_CONFIDENCE) {
    return {
      ...trailFields,
      bookingProviderSource: inferTrailSource(trailFields, trailUrls),
    };
  }

  return {
    bookingProvider: gg.provider,
    bookingProviderLabel: gg.providerLabel,
    bookingUrl: gg.bookingUrl,
    bookingProviderConfidence: gg.providerConfidence,
    bookingProviderEvidence: gg.evidence,
    bookingProviderSource: gg.providerSource,
  };
}
