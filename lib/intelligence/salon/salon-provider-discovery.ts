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
import {
  validateGlossGeniusPage,
  mapValidationSource,
  type GgValidationStatus,
} from "./glossgenius-page-validator";
import type { ProviderValidationDiagnostics } from "./provider-validation/types";
import { runSalonProviderDiscoveryPipeline } from "./provider-validation/discovery-pipeline";

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
  providerValidation?: ProviderValidationDiagnostics;
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
  ggCandidateUrls?: string[];
  ggValidatedUrl?: string;
  ggValidationStatus?: GgValidationStatus;
  providerResolverReason?: string;
};

export type SalonProviderBackfillStats = {
  oldHandleMatchesReviewed: number;
  confirmedKept: number;
  downgradedCandidateOnly: number;
  genericHomepageRejected: number;
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
  confidenceOverride?: number,
): ProspectBookingFields | null {
  if (!detection || detection.provider === "unknown") return null;
  const baseConf =
    detection.confidence === "high" ? 88 : detection.confidence === "medium" ? 72 : 55;
  return {
    bookingProvider: detection.provider,
    bookingProviderLabel: detection.providerLabel,
    bookingUrl: detection.bookingUrl,
    bookingProviderConfidence: confidenceOverride ?? baseConf,
    bookingProviderEvidence: [
      ...detection.evidence,
      `providerSource: ${source}`,
    ],
  };
}

async function validateGgDetectionFields(
  fields: ProspectBookingFields,
  source: BookingProviderSource,
  hints: { handle: string; displayName?: string | null },
): Promise<{
  fields: ProspectBookingFields | null;
  ggCandidateUrls: string[];
  ggValidatedUrl?: string;
  ggValidationStatus: GgValidationStatus;
  validationReason: string;
}> {
  const url = fields.bookingUrl;
  if (!url || fields.bookingProvider !== "glossgenius") {
    return {
      fields,
      ggCandidateUrls: [],
      ggValidationStatus: "not_attempted",
      validationReason: "not_glossgenius",
    };
  }

  const validation = await validateGlossGeniusPage({
    url,
    slugHint: url,
    displayNameHint: hints.displayName,
    handleHint: hints.handle,
    discoverySource: mapValidationSource(source),
  });

  const ggCandidateUrls = [url];

  if (!validation.confirmed) {
    return {
      fields: null,
      ggCandidateUrls,
      ggValidationStatus: validation.status,
      validationReason: validation.reason,
    };
  }

  return {
    fields: {
      ...fields,
      bookingUrl: validation.finalUrl,
      bookingProviderConfidence: validation.suggestedConfidence,
      bookingProviderEvidence: [
        ...(fields.bookingProviderEvidence ?? []),
        `ggValidation: ${validation.status}`,
        `positive: ${validation.positiveMarkers.join(", ")}`,
        validation.reason,
      ],
    },
    ggCandidateUrls,
    ggValidatedUrl: validation.finalUrl,
    ggValidationStatus: validation.status,
    validationReason: validation.reason,
  };
}

function buildGgDiagnosticsFromResult(
  ggResult: Awaited<ReturnType<typeof resolveGlossGeniusFromHandle>>,
): Pick<
  SalonProviderDiscoveryResult,
  "ggCandidateUrls" | "ggValidatedUrl" | "ggValidationStatus" | "ggCheckedUrls"
> {
  return {
    ggCandidateUrls: ggResult.ggCandidateUrls ?? ggResult.checkedUrls ?? [],
    ggValidatedUrl: ggResult.ggValidatedUrl,
    ggValidationStatus: ggResult.ggValidationStatus,
    ggCheckedUrls: ggResult.checkedUrls,
  };
}

function mapGgStatus(
  found: boolean,
  source?: string,
  reason?: string,
  validationStatus?: GgValidationStatus,
): ProspectGgResolverStatus {
  if (validationStatus === "confirmed_client_page" || found) {
    return source === "display_name_derived" ? "found_display" : "found_handle";
  }
  if (validationStatus === "generic_glossgenius_page" || validationStatus === "redirect_home") {
    return "generic_homepage";
  }
  if (validationStatus === "candidate_only") return "candidate_only";
  if (reason === "timeout" || validationStatus === "timeout") return "timeout";
  if (reason === "error" || validationStatus === "error") return "error";
  return "attempted_not_found";
}

function wasHandleDerivedGg(prospect: SalonProviderDiscoveryInput): boolean {
  return (
    prospect.bookingProvider === "glossgenius" &&
    (prospect.bookingProviderSource === "handle_derived" ||
      prospect.bookingProviderSource === "display_name_derived")
  );
}

function clearUnconfirmedBookingFields(): Partial<EnrichedProspectBookingFields> {
  return {
    bookingProvider: undefined,
    bookingProviderLabel: undefined,
    bookingUrl: undefined,
    bookingProviderConfidence: 0,
    bookingProviderEvidence: [],
    bookingProviderSource: undefined,
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

/**
 * Full salon provider discovery: candidates → provider-specific validation → confirmed signal only.
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

  const pipeline = await runSalonProviderDiscoveryPipeline({
    instagramHandle: input.instagramHandle,
    displayName: input.displayName,
    website: input.website,
    bio: input.bio,
    directUrls: directUrlsScanned,
    linkTrailUrls: linkTrailUrlsScanned,
    text,
    enableGeneratedFallback: options?.enableGgFallback !== false,
  });

  const downgrade = wasHandleDerivedGg(input);
  if (downgrade && !pipeline.bookingProvider) {
    return {
      ...clearUnconfirmedBookingFields(),
      ...pipeline,
      providerDiscoveryDebug: {
        ...pipeline.providerDiscoveryDebug,
        providerResolverReason: "downgraded_unconfirmed_gg",
      },
      ggResolverStatus: "candidate_only",
      ggResolverReason: "downgraded_unconfirmed_gg",
    };
  }

  return pipeline as SalonProviderDiscoveryResult;
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

  let directGgValidation = null;
  if (knownUrl && /glossgenius\.com/i.test(knownUrl)) {
    directGgValidation = await validateGlossGeniusPage({
      url: knownUrl,
      slugHint: knownUrl,
      displayNameHint: body.displayName,
      handleHint: handle,
      discoverySource: "direct_url",
    });
  }

  const finalProviderDecision = await enrichSalonProviderDiscovery(
    {
      instagramHandle: handle,
      displayName: body.displayName,
      bestMatchUrl: knownUrl,
      linkTrailUrlsScanned: knownUrl ? [knownUrl] : [],
    },
    { enableGgFallback: true },
  );

  const probeValidations =
    ggHandleResolver.probeLog?.map((p) => ({
      url: p.url,
      statusCode: p.httpStatus,
      finalUrl: p.finalUrl,
      positiveMarkers: p.positiveMarkers ?? p.markersFound,
      negativeMarkers: p.negativeMarkers ?? [],
      validationStatus: p.validationStatus,
      reason: p.reason,
    })) ?? [];

  return {
    directDetection,
    linkTrailDetection,
    directGgValidation,
    ggHandleResolver,
    ggDisplayResolver: ggHandleResolver,
    candidates,
    checkedUrls: ggHandleResolver.checkedUrls ?? candidates.map((c) => c.url),
    probeValidations,
    validationStatus: ggHandleResolver.ggValidationStatus,
    finalProviderDecision,
    finalProviderDecisionSummary: {
      bookingProvider: finalProviderDecision.bookingProvider ?? null,
      bookingUrl: finalProviderDecision.bookingUrl ?? null,
      ggValidationStatus: finalProviderDecision.ggValidationStatus ?? null,
      ggValidatedUrl: finalProviderDecision.ggValidatedUrl ?? null,
      ggCandidateUrls: finalProviderDecision.ggCandidateUrls ?? [],
      providerResolverReason: finalProviderDecision.providerDiscoveryDebug.providerResolverReason,
    },
  };
}
