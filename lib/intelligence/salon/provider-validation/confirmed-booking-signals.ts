// lib/intelligence/salon/provider-validation/confirmed-booking-signals.ts

import type { SalonStackSignal, SalonStackSignalSource } from "../business-stack/types";
import { validateProviderCandidate } from "./validate-provider-candidate";
import { discoverUrlCandidates, type DiscoverCandidatesInput } from "./discover-candidates";
import type { SalonProviderCandidate } from "./types";

const STACK_PROVIDER_ID: Record<string, string> = {
  glossgenius: "glossgenius",
  vagaro: "vagaro",
  square: "square_appointments",
  booksy: "booksy",
  fresha: "fresha",
  styleseat: "styleseat",
};

function mapSource(s: SalonProviderCandidate["source"]): SalonStackSignalSource {
  if (s === "link_in_bio") return "link_in_bio";
  if (s === "website_link" || s === "website_html") return "website_html";
  if (s === "public_search") return "public_search";
  return "direct_url";
}

export async function detectConfirmedBookingStackSignals(input: {
  prospectId?: string;
  instagramHandle: string;
  displayName?: string | null;
  website?: string | null;
  bio?: string | null;
  directUrls: string[];
  linkTrailUrls: string[];
  text?: string;
}): Promise<{
  signals: SalonStackSignal[];
  stats: {
    candidatesFound: number;
    validationsRun: number;
    confirmed: number;
    rejectedGeneric: number;
    rejectedNotFound: number;
  };
}> {
  const candidates = discoverUrlCandidates({
    prospectId: input.prospectId,
    instagramHandle: input.instagramHandle,
    displayName: input.displayName,
    website: input.website,
    bio: input.bio,
    directUrls: input.directUrls,
    linkTrailUrls: input.linkTrailUrls,
    text: input.text,
  });

  const hints = {
    handle: input.instagramHandle.replace(/^@+/, ""),
    displayName: input.displayName ?? undefined,
  };

  const signals: SalonStackSignal[] = [];
  const now = new Date().toISOString();
  let confirmed = 0;
  let rejectedGeneric = 0;
  let rejectedNotFound = 0;

  for (const c of candidates) {
    const v = await validateProviderCandidate(c, hints);
    if (v.confirmed) {
      confirmed++;
      const providerId = STACK_PROVIDER_ID[v.provider] ?? v.provider;
      signals.push({
        providerId,
        providerLabel: v.providerLabel,
        category: "booking",
        source: mapSource(c.source),
        url: v.finalUrl ?? v.candidateUrl,
        confidence: Math.round(v.confidence * 1000) / 1000,
        evidence: [
          "provider_validation:confirmed",
          v.reason,
          ...v.positiveMarkers.slice(0, 3).map((m) => `marker:${m}`),
        ],
        detectedAt: now,
      });
    } else if (
      v.status === "rejected_generic_homepage" ||
      v.status === "rejected_marketing_page" ||
      v.status === "rejected_redirect_home"
    ) {
      rejectedGeneric++;
    } else if (v.status === "rejected_not_found") {
      rejectedNotFound++;
    }
  }

  return {
    signals,
    stats: {
      candidatesFound: candidates.length,
      validationsRun: candidates.length,
      confirmed,
      rejectedGeneric,
      rejectedNotFound,
    },
  };
}
