// lib/intelligence/salon/provider-validation/discover-candidates.ts

import { randomUUID } from "crypto";
import { detectSalonBookingProvider, isLinkInBioUrl } from "../provider-detector";
import { extractGlossGeniusUrlsFromText, isGgClientSubdomainUrl } from "../glossgenius-url";
import { collectGlossGeniusCandidates } from "../glossgenius-handle-resolver";
import type {
  SalonProviderCandidate,
  SalonProviderCandidateSource,
} from "./types";

const MAX_GG_GENERATED = 8;

export type DiscoverCandidatesInput = {
  prospectId?: string;
  instagramHandle: string;
  displayName?: string | null;
  website?: string | null;
  bio?: string | null;
  directUrls: string[];
  linkTrailUrls: string[];
  text?: string;
};

function newCandidate(
  partial: Omit<SalonProviderCandidate, "id" | "createdAt">,
): SalonProviderCandidate {
  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

function urlCandidate(
  url: string,
  source: SalonProviderCandidateSource,
  generated: boolean,
  prospectId?: string,
  confidenceHint = 70,
): SalonProviderCandidate | null {
  const detection = detectSalonBookingProvider(url, {
    fromLinkInBio: source === "link_in_bio",
  });
  if (!detection || detection.provider === "unknown") {
    if (/glossgenius\.com/i.test(url) && isGgClientSubdomainUrl(url)) {
      return newCandidate({
        prospectId,
        provider: "glossgenius",
        providerLabel: "GlossGenius",
        candidateUrl: url.replace(/\/+$/, "") || url,
        source,
        confidenceHint: 75,
        generated,
      });
    }
    return null;
  }
  return newCandidate({
    prospectId,
    provider: detection.provider,
    providerLabel: detection.providerLabel,
    candidateUrl: detection.bookingUrl ?? url,
    source,
    confidenceHint,
    generated,
  });
}

function pushUnique(candidates: SalonProviderCandidate[], c: SalonProviderCandidate | null) {
  if (!c) return;
  const key = `${c.provider}:${c.candidateUrl.toLowerCase().replace(/\/+$/, "")}`;
  if (candidates.some((x) => `${x.provider}:${x.candidateUrl.toLowerCase().replace(/\/+$/, "")}` === key)) {
    return;
  }
  candidates.push(c);
}

export function discoverUrlCandidates(input: DiscoverCandidatesInput): SalonProviderCandidate[] {
  const candidates: SalonProviderCandidate[] = [];
  const { prospectId } = input;

  for (const url of input.directUrls) {
    if (!url?.startsWith("http") || isLinkInBioUrl(url)) continue;
    pushUnique(candidates, urlCandidate(url, "direct_url", false, prospectId, 88));
  }

  for (const url of input.linkTrailUrls) {
    if (!url?.startsWith("http") || isLinkInBioUrl(url)) continue;
    pushUnique(candidates, urlCandidate(url, "link_in_bio", false, prospectId, 85));
  }

  const text = input.text ?? "";
  for (const ggUrl of extractGlossGeniusUrlsFromText(text)) {
    pushUnique(
      candidates,
      newCandidate({
        prospectId,
        provider: "glossgenius",
        providerLabel: "GlossGenius",
        candidateUrl: ggUrl,
        source: "website_html",
        confidenceHint: 80,
        generated: false,
      }),
    );
  }

  if (input.website?.startsWith("http")) {
    pushUnique(candidates, urlCandidate(input.website, "website_link", false, prospectId, 82));
  }

  return candidates;
}

export function discoverGeneratedCandidates(input: DiscoverCandidatesInput): SalonProviderCandidate[] {
  const out: SalonProviderCandidate[] = [];
  const handle = input.instagramHandle.replace(/^@+/, "").trim();

  const ggDescriptors = collectGlossGeniusCandidates({
    instagramHandle: handle,
    displayName: input.displayName,
    website: input.website,
    bio: input.bio,
  }).slice(0, MAX_GG_GENERATED);

  for (const d of ggDescriptors) {
    pushUnique(
      out,
      newCandidate({
        prospectId: input.prospectId,
        provider: "glossgenius",
        providerLabel: "GlossGenius",
        candidateUrl: d.url,
        source: d.source === "display_name_derived" ? "display_guess" : "handle_guess",
        confidenceHint: d.source === "display_name_derived" ? 65 : 60,
        generated: true,
      }),
    );
  }

  return out;
}
