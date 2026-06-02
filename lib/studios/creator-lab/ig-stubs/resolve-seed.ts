// lib/studios/creator-lab/ig-stubs/resolve-seed.ts
// IG handle → profile fetch → bio/external URL → provider/website detection → StubResolutionResult.

import { generateCandidateUrls } from "./url-patterns";
import { fastResolveTracked } from "./validator";
import {
  fetchIgProfiles,
  extractUrlsFromBio,
  type IgProfileData,
  type IgProfileFetchResult,
} from "./ig-profile-fetch";
import {
  detectBestSalonBookingProvider,
  isLinkInBioUrl,
} from "@/lib/intelligence/salon/provider-detector";
import { uniquePublicUrls, normalizePublicUrl } from "./url-normalize";
import type {
  IgSeed,
  IgResolveContext,
  ResolveMode,
  ResolvedProfile,
  ResolverTrace,
  StubResolutionResult,
} from "./types";

function makeDirectProfile(
  url: string,
  platform: string,
  confidence: number,
  reason: string,
): ResolvedProfile {
  return {
    platform,
    url,
    matchReason: reason,
    extractedTitle: null,
    extractedDescription: null,
    detectedName: null,
    detectedLocation: null,
    detectedServices: [],
    detectedPrices: [],
    detectedSocialLinks: [],
    confidenceScore: confidence,
    evidenceSnippets: [reason],
  };
}

function collectDirectUrlsFromProfile(igProfile: IgProfileData | null): string[] {
  if (!igProfile) return [];
  const raw: string[] = [];
  if (igProfile.externalUrl) raw.push(igProfile.externalUrl);
  raw.push(...(igProfile.extraExternalUrls ?? []));
  if (igProfile.biography) raw.push(...extractUrlsFromBio(igProfile.biography));
  return uniquePublicUrls(raw);
}

function isPlainWebsiteUrl(url: string): boolean {
  if (!url.startsWith("http")) return false;
  const lower = url.toLowerCase();
  if (lower.includes("instagram.com") || lower.includes("facebook.com")) return false;
  if (isLinkInBioUrl(url)) return false;
  return true;
}

function buildTraceSkeleton(
  seed: IgSeed,
  profileFetch: IgProfileFetchResult,
  igProfile: IgProfileData | null,
): ResolverTrace {
  return {
    handle: seed.handle,
    profileFetch: {
      attempted: Boolean(profileFetch.apifyOk || profileFetch.error || profileFetch.runId),
      found: igProfile?.found ?? false,
      externalUrl: igProfile?.externalUrl ?? null,
      biography: igProfile?.biography ?? null,
      bioUrls: igProfile?.extraExternalUrls ?? [],
      error: profileFetch.error ?? igProfile?.error ?? null,
    },
    extracted: {
      allDirectUrls: [],
      providerFromDirectUrl: null,
      providerFromDirectUrlSource: null,
      websiteUrl: null,
    },
    generatedCandidates: { count: 0, linkTrailBookingUrls: [] },
    resolverDecision: {
      status: "unresolved",
      bestUrl: null,
      platform: null,
      confidence: 0,
      reason: "No match found",
    },
  };
}

function tryDirectUrlResolution(
  seed: IgSeed,
  directUrls: string[],
  trace: ResolverTrace,
): StubResolutionResult | null {
  trace.extracted.allDirectUrls = directUrls;
  if (directUrls.length === 0) return null;

  const detection = detectBestSalonBookingProvider({ urls: directUrls });
  if (detection && detection.provider !== "unknown") {
    const bookingUrl =
      detection.bookingUrl ??
      directUrls.find((u) => u.toLowerCase().includes(detection.provider)) ??
      directUrls[0];
    const confidence =
      detection.confidence === "high" ? 95 : detection.confidence === "medium" ? 80 : 60;
    const profile = makeDirectProfile(
      bookingUrl,
      detection.provider,
      confidence,
      `Direct IG profile URL → ${detection.providerLabel}`,
    );

    trace.extracted.providerFromDirectUrl = detection.provider;
    trace.extracted.providerFromDirectUrlSource = "direct_url";
    trace.resolverDecision = {
      status: "resolved",
      bestUrl: bookingUrl,
      platform: detection.provider,
      confidence,
      reason: `Booking provider ${detection.providerLabel} from IG profile link (direct_url).`,
    };

    return {
      seed: {
        ...seed,
        displayName: seed.displayName || trace.profileFetch.biography?.slice(0, 80) || seed.handle,
      },
      resolvedProfiles: [profile],
      bestMatch: profile,
      status: "resolved",
      candidateUrlsTested: directUrls,
      rejectedCandidates: [],
      linkTrailUrls: directUrls,
      trace,
      igContext: {
        biography: trace.profileFetch.biography,
        externalUrl: trace.profileFetch.externalUrl,
        displayNameFromProfile: null,
        directUrlsScanned: directUrls,
      },
    };
  }

  const websiteUrl = directUrls.find(isPlainWebsiteUrl) ?? null;
  if (websiteUrl) {
    const profile = makeDirectProfile(
      websiteUrl,
      "website",
      70,
      "Public website from Instagram profile external link.",
    );
    trace.extracted.websiteUrl = websiteUrl;
    trace.resolverDecision = {
      status: "website_found",
      bestUrl: websiteUrl,
      platform: "website",
      confidence: 70,
      reason: "Public website found from IG profile. No booking platform on profile link.",
    };

    return {
      seed,
      resolvedProfiles: [profile],
      bestMatch: profile,
      status: "partial",
      candidateUrlsTested: directUrls,
      rejectedCandidates: [],
      linkTrailUrls: directUrls,
      trace,
      igContext: {
        biography: trace.profileFetch.biography,
        externalUrl: trace.profileFetch.externalUrl,
        displayNameFromProfile: null,
        directUrlsScanned: directUrls,
      },
    };
  }

  return null;
}

export async function resolveIgSeed(
  seed: IgSeed,
  options: {
    mode: ResolveMode;
    igProfile?: IgProfileData | null;
    profileFetch?: IgProfileFetchResult;
  },
): Promise<StubResolutionResult> {
  const profileFetch = options.profileFetch ?? {
    profiles: new Map(),
    apifyOk: false,
    runId: null,
    error: "Profile fetch not run",
  };
  const igProfile =
    options.igProfile ??
    profileFetch.profiles.get(seed.handle.toLowerCase()) ??
    null;

  const trace = buildTraceSkeleton(seed, profileFetch, igProfile);
  if (igProfile?.fullName && !seed.displayName) {
    seed = { ...seed, displayName: igProfile.fullName };
  }

  const directUrls = collectDirectUrlsFromProfile(igProfile);
  const directHit = tryDirectUrlResolution(seed, directUrls, trace);
  if (directHit) return directHit;

  const candidates = generateCandidateUrls(seed.handle);
  trace.generatedCandidates.count = candidates.length;

  let validProfiles: ResolvedProfile[] = [];
  let candidateUrlsTested = candidates.map((c) => c.url);
  let rejectedCandidates: StubResolutionResult["rejectedCandidates"] = [];
  let linkTrailUrls: string[] = [];

  if (options.mode === "fast") {
    const tracked = await fastResolveTracked(seed, candidates);
    validProfiles = tracked.confirmedProfiles.filter((p) => p.confidenceScore >= 5);
    candidateUrlsTested = uniquePublicUrls([
      ...directUrls,
      ...tracked.candidateUrlsTested,
    ]);
    rejectedCandidates = tracked.rejectedCandidates;
    linkTrailUrls = uniquePublicUrls([...directUrls, ...tracked.linkTrailUrls]);
  } else {
    const { deepResolve } = await import("./deep-research");
    const profiles = await deepResolve(seed, candidates);
    validProfiles = profiles.filter((p) => p.confidenceScore >= 5);
    candidateUrlsTested = uniquePublicUrls([...directUrls, ...candidates.map((c) => c.url)]);
    linkTrailUrls = directUrls;
  }

  trace.generatedCandidates.linkTrailBookingUrls = linkTrailUrls.filter(
    (u) => !directUrls.includes(u),
  );

  if (validProfiles.length === 0 && linkTrailUrls.length > 0) {
    const trailDetection = detectBestSalonBookingProvider({ urls: linkTrailUrls });
    if (trailDetection && trailDetection.provider !== "unknown") {
      const bookingUrl = trailDetection.bookingUrl ?? linkTrailUrls[0];
      const confidence = trailDetection.confidence === "high" ? 82 : 68;
      const trailProfile = makeDirectProfile(
        bookingUrl,
        trailDetection.provider,
        confidence,
        `Booking URL from link-in-bio trail → ${trailDetection.providerLabel}`,
      );
      trace.resolverDecision = {
        status: "partial",
        bestUrl: bookingUrl,
        platform: trailDetection.provider,
        confidence,
        reason: `${trailDetection.providerLabel} booking URL from link-in-bio expansion.`,
      };
      return {
        seed,
        resolvedProfiles: [trailProfile],
        bestMatch: trailProfile,
        status: "partial",
        candidateUrlsTested,
        rejectedCandidates,
        linkTrailUrls,
        trace,
        igContext: {
          biography: trace.profileFetch.biography,
          externalUrl: trace.profileFetch.externalUrl,
          directUrlsScanned: uniquePublicUrls([...directUrls, ...linkTrailUrls]),
        },
      };
    }
  }

  const bestMatch = validProfiles[0] ?? null;
  const status: StubResolutionResult["status"] =
    bestMatch && bestMatch.confidenceScore >= 50
      ? "resolved"
      : bestMatch && bestMatch.confidenceScore >= 20
        ? "partial"
        : "unresolved";

  trace.resolverDecision = {
    status:
      status === "unresolved" ? "unresolved" : status === "partial" ? "partial" : "resolved",
    bestUrl: bestMatch?.url ?? null,
    platform: bestMatch?.platform ?? null,
    confidence: bestMatch?.confidenceScore ?? 0,
    reason: bestMatch
      ? bestMatch.matchReason
      : profileFetch.error
        ? `IG profile fetch: ${profileFetch.error}`
        : "No booking profile via direct URL, link trail, or generated candidates.",
  };

  return {
    seed,
    resolvedProfiles: validProfiles,
    bestMatch,
    status,
    candidateUrlsTested,
    rejectedCandidates,
    linkTrailUrls: uniquePublicUrls([...directUrls, ...linkTrailUrls]),
    trace,
    igContext: {
      biography: trace.profileFetch.biography,
      externalUrl: trace.profileFetch.externalUrl,
      directUrlsScanned: uniquePublicUrls([...directUrls, ...candidateUrlsTested, ...linkTrailUrls]),
    },
  };
}

export async function fetchAndResolveIgSeeds(
  seeds: IgSeed[],
  mode: ResolveMode,
): Promise<{ profileFetch: IgProfileFetchResult; results: StubResolutionResult[] }> {
  const profileFetch = await fetchIgProfiles(seeds.map((s) => s.handle));
  const results = await Promise.all(
    seeds.map((seed) =>
      resolveIgSeed(seed, {
        mode,
        profileFetch,
        igProfile: profileFetch.profiles.get(seed.handle.toLowerCase()) ?? null,
      }),
    ),
  );
  return { profileFetch, results };
}
