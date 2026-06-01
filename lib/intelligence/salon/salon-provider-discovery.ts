// lib/intelligence/salon/salon-provider-discovery.ts
// Ordered salon provider discovery: direct URL → link trail → GG fallback.

import {
  detectBookingFromProspectTrail,
  type ProspectBookingFields,
} from "./booking-from-trail";
import {
  detectBestSalonBookingProvider,
  detectSalonBookingProvider,
  isLinkInBioUrl,
} from "./provider-detector";
import type { BookingProviderSource } from "./enrich-booking-provider";
import type { EnrichedProspectBookingFields } from "./enrich-booking-provider";
import {
  collectGlossGeniusCandidates,
  resolveGlossGeniusFromHandle,
  legacyGlossGeniusEnrichFields,
  type GlossGeniusHandleResolverInput,
} from "./glossgenius-handle-resolver";
import type { ProspectEvidence } from "@/lib/studios/prospects/types";
import type { ProspectGgResolverStatus } from "./gg-resolver-types";

const SKIP_GG_CONFIDENCE = 90;
const MAX_GG_CANDIDATES = 8;

export type ProviderDiscoveryDebug = {
  directUrlsScanned: string[];
  linkTrailUrlsScanned: string[];
  linkInBioFetched: boolean;
  providerDetectedFromDirect: boolean;
  providerDetectedFromLinkTrail: boolean;
  ggHandleAttempted: boolean;
  ggDisplayAttempted: boolean;
  ggCheckedUrls: string[];
  providerResolverReason: string;
};

export type SalonProviderDiscoveryInput = {
  instagramHandle: string;
  displayName?: string | null;
  website?: string | null;
  bio?: string | null;
  bioUrl?: string | null;
  bestMatchUrl?: string | null;
  allMatchedUrls?: Array<{ url: string } | string>;
  linkTrailUrls?: string[];
  linkTrailUrlsScanned?: string[];
  linkInBioUrl?: string | null;
  linkInBioPageFetched?: boolean;
  evidence?: ProspectEvidence[];
  bookingProvider?: string;
  bookingProviderConfidence?: number;
  bookingProviderSource?: string;
  bookingUrl?: string;
};

export type SalonProviderDiscoveryResult = EnrichedProspectBookingFields & {
  providerDiscoveryDebug: ProviderDiscoveryDebug;
  ggResolverStatus?: ProspectGgResolverStatus;
  ggResolverReason?: string;
  ggCheckedUrls?: string[];
  providerResolverReason?: string;
};

function uniqueUrls(urls: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const u = (raw ?? "").trim();
    if (!u || !u.startsWith("http")) continue;
    const key = u.toLowerCase().replace(/\/+$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u);
  }
  return out;
}

function fieldsFromDetection(
  detection: ReturnType<typeof detectSalonBookingProvider>,
  source: BookingProviderSource,
): ProspectBookingFields | null {
  if (!detection || detection.provider === "unknown") return null;
  return {
    bookingProvider: detection.provider,
    bookingProviderLabel: detection.providerLabel,
    bookingUrl: detection.bookingUrl,
    bookingProviderConfidence: detection.confidence === "high" ? 88 : detection.confidence === "medium" ? 72 : 55,
    bookingProviderEvidence: [
      ...detection.evidence,
      `providerSource: ${source}`,
    ],
  };
}

function scoreFields(f?: ProspectBookingFields): number {
  return f?.bookingProviderConfidence ?? 0;
}

function pickBetter(
  a: ProspectBookingFields | null,
  b: ProspectBookingFields | null,
): ProspectBookingFields | null {
  if (!a?.bookingProvider) return b;
  if (!b?.bookingProvider) return a;
  return scoreFields(b) > scoreFields(a) ? b : a;
}

function inferSource(urls: string[], fields: ProspectBookingFields): BookingProviderSource {
  const bookingUrl = fields.bookingUrl;
  if (bookingUrl && detectSalonBookingProvider(bookingUrl)?.provider === fields.bookingProvider) {
    return urls.some((u) => isLinkInBioUrl(u)) && isLinkInBioUrl(bookingUrl) ? "link_in_bio" : "direct_url";
  }
  for (const url of urls) {
    const hit = detectSalonBookingProvider(url);
    if (hit?.provider === fields.bookingProvider) {
      return isLinkInBioUrl(url) ? "link_in_bio" : "direct_url";
    }
  }
  return "direct_url";
}

function detectDirectProviders(
  directUrls: string[],
  text: string,
): { fields: ProspectBookingFields | null; fromDirect: boolean } {
  const nonAggregator = directUrls.filter((u) => !isLinkInBioUrl(u));
  const detection = detectBestSalonBookingProvider({
    urls: nonAggregator,
    text,
    linkPageLinks: [],
  });
  const fields = fieldsFromDetection(detection, "direct_url");
  return { fields, fromDirect: Boolean(fields?.bookingProvider) };
}

function detectLinkTrailProviders(
  linkTrailUrls: string[],
  text: string,
): { fields: ProspectBookingFields | null; fromLinkTrail: boolean } {
  const detection = detectBestSalonBookingProvider({
    urls: linkTrailUrls.filter((u) => !isLinkInBioUrl(u)),
    text,
    linkPageLinks: linkTrailUrls,
  });
  const fields = fieldsFromDetection(detection, "link_in_bio");
  return { fields, fromLinkTrail: Boolean(fields?.bookingProvider) };
}

function mapGgStatus(
  found: boolean,
  source?: string,
  reason?: string,
): ProspectGgResolverStatus {
  if (found) return source === "display_name_derived" ? "found_display" : "found_handle";
  if (reason === "timeout") return "timeout";
  if (reason === "error") return "error";
  return "attempted_not_found";
}

/**
 * Full salon provider discovery with explicit priority and diagnostics.
 */
export async function enrichSalonProviderDiscovery(
  input: SalonProviderDiscoveryInput,
  options?: {
    enableGgFallback?: boolean;
  },
): Promise<SalonProviderDiscoveryResult> {
  const linkTrailUrlsScanned = uniqueUrls([
    ...(input.linkTrailUrlsScanned ?? []),
    ...(input.linkTrailUrls ?? []),
    ...(input.allMatchedUrls ?? []).map((u) => (typeof u === "string" ? u : u.url)),
    input.bestMatchUrl,
    input.bookingUrl,
  ]);

  const directUrlsScanned = uniqueUrls([
    input.bioUrl,
    input.website,
    input.bestMatchUrl,
    input.bookingUrl,
    ...(input.allMatchedUrls ?? []).map((u) => (typeof u === "string" ? u : u.url)),
  ]).filter((u) => !isLinkInBioUrl(u));

  const text = [
    input.bio,
    ...(input.evidence ?? []).map((e) =>
      typeof e === "string" ? e : [e.label, e.url].filter(Boolean).join(" "),
    ),
  ]
    .filter(Boolean)
    .join(" ");

  const linkInBioFetched = Boolean(
    input.linkInBioPageFetched ||
      (input.linkInBioUrl && linkTrailUrlsScanned.length > 1),
  );

  const direct = detectDirectProviders(directUrlsScanned, text);
  const trail = detectLinkTrailProviders(linkTrailUrlsScanned, text);

  let fields = pickBetter(direct.fields, trail.fields);
  let providerDetectedFromDirect = direct.fromDirect;
  let providerDetectedFromLinkTrail =
    trail.fromLinkTrail && !direct.fromDirect;

  if (fields?.bookingProvider) {
    const srcUrls = providerDetectedFromLinkTrail ? linkTrailUrlsScanned : directUrlsScanned;
    return {
      ...fields,
      bookingProviderSource: inferSource(srcUrls, fields),
      providerDiscoveryDebug: {
        directUrlsScanned,
        linkTrailUrlsScanned,
        linkInBioFetched,
        providerDetectedFromDirect,
        providerDetectedFromLinkTrail,
        ggHandleAttempted: false,
        ggDisplayAttempted: false,
        ggCheckedUrls: [],
        providerResolverReason: providerDetectedFromLinkTrail
          ? "link_trail_detection"
          : "direct_url_detection",
      },
      ggResolverStatus: "skipped_existing_provider",
      ggResolverReason: "provider_found_before_gg",
    };
  }

  // Legacy combined trail pass (catches edge cases in evidence text)
  const combined = detectBookingFromProspectTrail({
    bestMatchUrl: input.bestMatchUrl,
    allMatchedUrls: input.allMatchedUrls,
    evidence: input.evidence,
    linkTrailUrls: input.linkTrailUrls,
    linkTrailUrlsScanned: linkTrailUrlsScanned,
  });

  if (combined.bookingProvider) {
    fields = combined;
    providerDetectedFromLinkTrail = linkTrailUrlsScanned.some((u) =>
      /glossgenius|vagaro|square|booksy|fresha|styleseat/i.test(u),
    );
    providerDetectedFromDirect = directUrlsScanned.some(
      (u) =>
        detectSalonBookingProvider(u)?.provider === combined.bookingProvider,
    );
    if (scoreFields(fields) >= SKIP_GG_CONFIDENCE || options?.enableGgFallback === false) {
      return {
        ...fields,
        bookingProviderSource: inferSource(linkTrailUrlsScanned, fields),
        providerDiscoveryDebug: {
          directUrlsScanned,
          linkTrailUrlsScanned,
          linkInBioFetched,
          providerDetectedFromDirect,
          providerDetectedFromLinkTrail,
          ggHandleAttempted: false,
          ggDisplayAttempted: false,
          ggCheckedUrls: [],
          providerResolverReason: "combined_trail_detection",
        },
        ggResolverStatus: "skipped_existing_provider",
        ggResolverReason: "provider_found_before_gg",
      };
    }
  }

  if (options?.enableGgFallback === false) {
    return {
      ...(fields ?? {}),
      providerDiscoveryDebug: {
        directUrlsScanned,
        linkTrailUrlsScanned,
        linkInBioFetched,
        providerDetectedFromDirect: false,
        providerDetectedFromLinkTrail: false,
        ggHandleAttempted: false,
        ggDisplayAttempted: false,
        ggCheckedUrls: [],
        providerResolverReason: "no_provider_gg_disabled",
      },
      ggResolverStatus: "not_attempted",
    };
  }

  const ggInput: GlossGeniusHandleResolverInput = {
    instagramHandle: input.instagramHandle,
    displayName: input.displayName,
    website: input.website,
    bio: input.bio,
  };

  const candidates = collectGlossGeniusCandidates(ggInput).slice(0, MAX_GG_CANDIDATES);
  const ggHandleAttempted = candidates.some((c) => c.source === "handle_derived");
  const ggDisplayAttempted = candidates.some((c) => c.source === "display_name_derived");

  let ggResult;
  try {
    ggResult = await resolveGlossGeniusFromHandle(ggInput, {
      publicUrls: linkTrailUrlsScanned,
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message : "gg_error";
    return {
      ...(fields ?? {}),
      providerDiscoveryDebug: {
        directUrlsScanned,
        linkTrailUrlsScanned,
        linkInBioFetched,
        providerDetectedFromDirect: false,
        providerDetectedFromLinkTrail: false,
        ggHandleAttempted,
        ggDisplayAttempted,
        ggCheckedUrls: [],
        providerResolverReason: reason,
      },
      ggResolverStatus: "error",
      ggResolverReason: reason,
    };
  }

  const ggCheckedUrls = ggResult.checkedUrls ?? candidates.map((c) => c.url);

  if (!ggResult.found) {
    return {
      ...(fields ?? {}),
      providerDiscoveryDebug: {
        directUrlsScanned,
        linkTrailUrlsScanned,
        linkInBioFetched,
        providerDetectedFromDirect: false,
        providerDetectedFromLinkTrail: false,
        ggHandleAttempted,
        ggDisplayAttempted,
        ggCheckedUrls,
        providerResolverReason: ggResult.reason ?? "gg_not_found",
      },
      ggResolverStatus: mapGgStatus(false, ggResult.source, ggResult.reason),
      ggResolverReason: ggResult.reason,
      ggCheckedUrls,
    };
  }

  const gg = legacyGlossGeniusEnrichFields(ggResult);
  if (!gg) {
    return {
      ...(fields ?? {}),
      providerDiscoveryDebug: {
        directUrlsScanned,
        linkTrailUrlsScanned,
        linkInBioFetched,
        providerDetectedFromDirect: false,
        providerDetectedFromLinkTrail: false,
        ggHandleAttempted,
        ggDisplayAttempted,
        ggCheckedUrls,
        providerResolverReason: "gg_weak_match_rejected",
      },
      ggResolverStatus: "attempted_not_found",
      ggResolverReason: "weak_match",
    };
  }

  if (fields?.bookingProvider && scoreFields(fields) >= SKIP_GG_CONFIDENCE) {
    return {
      ...fields,
      bookingProviderSource: inferSource(linkTrailUrlsScanned, fields),
      providerDiscoveryDebug: {
        directUrlsScanned,
        linkTrailUrlsScanned,
        linkInBioFetched,
        providerDetectedFromDirect,
        providerDetectedFromLinkTrail,
        ggHandleAttempted,
        ggDisplayAttempted,
        ggCheckedUrls,
        providerResolverReason: "trail_kept_over_gg",
      },
      ggResolverStatus: "skipped_existing_provider",
      ggResolverReason: "high_confidence_trail",
      ggCheckedUrls,
    };
  }

  return {
    bookingProvider: gg.provider,
    bookingProviderLabel: gg.providerLabel,
    bookingUrl: gg.bookingUrl,
    bookingProviderConfidence: gg.providerConfidence,
    bookingProviderEvidence: gg.evidence,
    bookingProviderSource: gg.providerSource,
    providerDiscoveryDebug: {
      directUrlsScanned,
      linkTrailUrlsScanned,
      linkInBioFetched,
      providerDetectedFromDirect: false,
      providerDetectedFromLinkTrail: false,
      ggHandleAttempted,
      ggDisplayAttempted,
      ggCheckedUrls,
      providerResolverReason:
        gg.providerSource === "display_name_derived"
          ? "gg_display_match"
          : "gg_handle_match",
    },
    ggResolverStatus: mapGgStatus(true, gg.providerSource),
    ggResolverReason: "found",
    ggCheckedUrls,
  };
}

/** Debug payload for POST /api/admin/intelligence/salon/provider-debug */
export async function debugSalonProviderDiscovery(body: {
  instagramHandle: string;
  displayName?: string;
  knownUrl?: string;
}) {
  const handle = body.instagramHandle.replace(/^@+/, "").trim();
  const knownUrl = body.knownUrl?.trim();

  const directDetection = knownUrl
    ? detectSalonBookingProvider(knownUrl)
    : null;

  const linkTrailDetection = knownUrl
    ? detectSalonBookingProvider(knownUrl, { fromLinkInBio: true })
    : null;

  const candidates = collectGlossGeniusCandidates({
    instagramHandle: handle,
    displayName: body.displayName,
  }).slice(0, MAX_GG_CANDIDATES);

  const ggHandleResolver = await resolveGlossGeniusFromHandle(
    { instagramHandle: handle, displayName: body.displayName },
    { publicUrls: knownUrl ? [knownUrl] : [] },
  );

  const finalProviderDecision = await enrichSalonProviderDiscovery(
    {
      instagramHandle: handle,
      displayName: body.displayName,
      bestMatchUrl: knownUrl,
      linkTrailUrlsScanned: knownUrl ? [knownUrl] : [],
    },
    { enableGgFallback: true },
  );

  return {
    directDetection,
    linkTrailDetection,
    ggHandleResolver,
    ggDisplayResolver: ggHandleResolver,
    candidates,
    checkedUrls: ggHandleResolver.checkedUrls ?? candidates.map((c) => c.url),
    finalProviderDecision,
  };
}
