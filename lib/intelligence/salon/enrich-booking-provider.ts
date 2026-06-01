// lib/intelligence/salon/enrich-booking-provider.ts
// Booking provider enrichment: public URL trail first, then GlossGenius handle resolver.

import {
  detectBookingFromProspectTrail,
  type ProspectBookingFields,
} from "./booking-from-trail";
import { detectSalonBookingProvider } from "./provider-detector";
import { resolveGlossGeniusFromHandle } from "./glossgenius-handle-resolver";
import type { ProspectEvidence } from "@/lib/studios/prospects/types";

export type BookingProviderSource = "direct_url" | "link_trail" | "handle_derived";

export type EnrichedProspectBookingFields = ProspectBookingFields & {
  bookingProviderSource?: BookingProviderSource;
};

export type GlossGeniusResolverStatus = "gg_direct" | "gg_handle_match" | "gg_not_found";

export function glossGeniusResolverStatus(
  fields: EnrichedProspectBookingFields,
  trailUrls: string[] = [],
): GlossGeniusResolverStatus {
  if (fields.bookingProvider !== "glossgenius") return "gg_not_found";
  if (fields.bookingProviderSource === "handle_derived") return "gg_handle_match";

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

function inferTrailSource(
  trailFields: ProspectBookingFields,
  urls: string[],
): BookingProviderSource {
  const bookingUrl = trailFields.bookingUrl;
  if (bookingUrl && detectSalonBookingProvider(bookingUrl)?.provider === trailFields.bookingProvider) {
    return "direct_url";
  }
  for (const url of urls) {
    const hit = detectSalonBookingProvider(url);
    if (hit?.provider === trailFields.bookingProvider) {
      return url.includes("linktr.ee") || url.includes("beacons.ai") || url.includes("stan.store")
        ? "link_trail"
        : "direct_url";
    }
  }
  return "direct_url";
}

function hasGlossGeniusInTrail(urls: string[]): boolean {
  return urls.some((u) => detectSalonBookingProvider(u)?.provider === "glossgenius");
}

/**
 * Detect booking provider from URL trails, then optionally probe GlossGenius subdomains.
 * Set `enableHandleDerivedGlossGenius: false` during hashtag harvest.
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
    return {
      ...trailFields,
      bookingProviderSource: inferTrailSource(trailFields, trailUrls),
    };
  }

  if (options?.enableHandleDerivedGlossGenius === false) {
    return {};
  }

  if (hasGlossGeniusInTrail(trailUrls)) {
    return {};
  }

  const gg = await resolveGlossGeniusFromHandle(
    {
      instagramHandle: input.instagramHandle,
      displayName: input.displayName,
      website: input.website,
      bio: input.bio,
    },
    { publicUrls: trailUrls },
  );

  if (!gg) return {};

  return {
    bookingProvider: gg.provider,
    bookingProviderLabel: gg.providerLabel,
    bookingUrl: gg.bookingUrl,
    bookingProviderConfidence: gg.providerConfidence,
    bookingProviderEvidence: gg.evidence,
    bookingProviderSource: gg.providerSource,
  };
}
