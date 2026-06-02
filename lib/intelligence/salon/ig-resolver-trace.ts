// lib/intelligence/salon/ig-resolver-trace.ts

import type { ResolverTrace, StubResolutionResult } from "@/lib/studios/creator-lab/ig-stubs/types";
import {
  detectBestSalonBookingProvider,
  detectSalonBookingProvider,
} from "./provider-detector";

export type SalonIgResolverTrace = {
  handle: string;
  profileFetch: {
    attempted: boolean;
    status: string;
    source: string;
    error: string | null;
  };
  extracted: {
    username: string;
    displayName: string;
    bio: string | null;
    externalUrl: string | null;
    bioUrls: string[];
    allUrlsFound: string[];
  };
  providerDetection: {
    directUrlResults: Array<{
      url: string;
      provider: string | null;
      bookingUrl: string | null;
      confidence: string | null;
    }>;
    bestProvider: string | null;
    websiteFound: boolean;
  };
  persistence: {
    prospectId: string | null;
    fieldsUpdated: string[];
    errors: string[];
  };
  resolverDecision: {
    status: string;
    platform: string | null;
    bestUrl: string | null;
    confidence: number;
    reason: string;
  };
};

export function buildSalonIgResolverTrace(input: {
  handle: string;
  displayName?: string;
  trace: ResolverTrace;
  result?: StubResolutionResult;
  profileFetchSource?: string;
  prospectId?: string | null;
  persistenceErrors?: string[];
}): SalonIgResolverTrace {
  const { trace, result } = input;
  const directUrls = trace.extracted.allDirectUrls;
  const directUrlResults = directUrls.map((url) => {
    const hit = detectSalonBookingProvider(url);
    return {
      url,
      provider: hit?.provider ?? null,
      bookingUrl: hit?.bookingUrl ?? null,
      confidence: hit?.confidence ?? null,
    };
  });
  const bestDetection = detectBestSalonBookingProvider({ urls: directUrls });

  const fieldsUpdated: string[] = [];
  if (result?.bestMatch?.url) fieldsUpdated.push("bestMatch.url");
  if (result?.linkTrailUrls?.length) fieldsUpdated.push("linkTrailUrlsScanned");
  if (result?.candidateUrlsTested?.length) fieldsUpdated.push("candidateUrlsTested");
  if (result?.resolvedProfiles?.length) fieldsUpdated.push("allMatchedUrls");
  if (result?.igContext?.directUrlsScanned?.length) {
    fieldsUpdated.push("providerDiscoveryDebug.directUrlsScanned");
  }
  if (trace.extracted.websiteUrl) fieldsUpdated.push("website");

  return {
    handle: input.handle,
    profileFetch: {
      attempted: trace.profileFetch.attempted,
      status: trace.profileFetch.found
        ? "ok"
        : trace.profileFetch.error
          ? "error"
          : "not_found",
      source: input.profileFetchSource ?? "apify/instagram-profile-scraper",
      error: trace.profileFetch.error,
    },
    extracted: {
      username: input.handle,
      displayName: input.displayName ?? input.handle,
      bio: trace.profileFetch.biography,
      externalUrl: trace.profileFetch.externalUrl,
      bioUrls: trace.profileFetch.bioUrls,
      allUrlsFound: uniqueUrls([
        ...directUrls,
        ...(result?.linkTrailUrls ?? []),
        ...(result?.candidateUrlsTested ?? []),
      ]),
    },
    providerDetection: {
      directUrlResults,
      bestProvider: trace.extracted.providerFromDirectUrl ?? bestDetection?.provider ?? null,
      websiteFound: Boolean(trace.extracted.websiteUrl),
    },
    persistence: {
      prospectId: input.prospectId ?? null,
      fieldsUpdated,
      errors: input.persistenceErrors ?? [],
    },
    resolverDecision: {
      status: trace.resolverDecision.status,
      platform: trace.resolverDecision.platform,
      bestUrl: trace.resolverDecision.bestUrl,
      confidence: trace.resolverDecision.confidence,
      reason: trace.resolverDecision.reason,
    },
  };
}

function uniqueUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const key = u.toLowerCase().replace(/\/+$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u);
  }
  return out;
}
