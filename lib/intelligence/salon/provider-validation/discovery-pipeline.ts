// lib/intelligence/salon/provider-validation/discovery-pipeline.ts

import type { BookingProviderSource } from "../enrich-booking-provider";
import type { GgValidationStatus } from "../glossgenius-page-validator";
import type { EnrichedProspectBookingFields } from "../enrich-booking-provider";
import { isLinkInBioUrl } from "../provider-detector";
import type { ProviderDiscoveryDebug } from "../salon-provider-discovery";
import type { ProspectGgResolverStatus } from "../gg-resolver-types";
import {
  discoverGeneratedCandidates,
  discoverUrlCandidates,
  type DiscoverCandidatesInput,
} from "./discover-candidates";
import { validateProviderCandidate } from "./validate-provider-candidate";
import type {
  ConfirmedBookingFields,
  ProviderValidationDiagnostics,
  SalonProviderCandidate,
  SalonProviderValidation,
} from "./types";

export type SalonProviderPipelineInput = DiscoverCandidatesInput & {
  enableGeneratedFallback?: boolean;
};

export type SalonProviderPipelineResult = EnrichedProspectBookingFields & {
  providerDiscoveryDebug: ProviderDiscoveryDebug & {
    providerValidation?: ProviderValidationDiagnostics;
  };
  ggResolverStatus?: ProspectGgResolverStatus;
  ggResolverReason?: string;
  ggCheckedUrls?: string[];
  ggCandidateUrls?: string[];
  ggValidatedUrl?: string;
  ggValidationStatus?: GgValidationStatus;
  providerResolverReason?: string;
};

const SOURCE_PRIORITY: Record<string, number> = {
  direct_url: 100,
  link_in_bio: 90,
  website_link: 85,
  website_html: 80,
  public_search: 75,
  handle_guess: 50,
  display_guess: 45,
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

function mapCandidateSourceToBookingSource(
  source: SalonProviderCandidate["source"],
): BookingProviderSource {
  if (source === "handle_guess") return "handle_derived";
  if (source === "display_guess") return "display_name_derived";
  if (source === "link_in_bio") return "link_in_bio";
  if (source === "website_link" || source === "website_html") return "website_crawl";
  if (source === "public_search") return "google_search";
  return "direct_url";
}

function mapValidationToGgStatus(status: SalonProviderValidation["status"]): GgValidationStatus {
  switch (status) {
    case "confirmed":
      return "confirmed_client_page";
    case "rejected_generic_homepage":
      return "generic_glossgenius_page";
    case "rejected_redirect_home":
      return "redirect_home";
    case "rejected_not_found":
      return "not_found";
    case "blocked":
      return "blocked";
    case "timeout":
      return "timeout";
    case "error":
      return "error";
    case "rejected_marketing_page":
    case "rejected_login_signup":
      return "generic_glossgenius_page";
    default:
      return "candidate_only";
  }
}

function scoreValidation(
  v: SalonProviderValidation,
  c: SalonProviderCandidate,
): number {
  let score = v.confidence * 100;
  if (!c.generated) score += 15;
  score += SOURCE_PRIORITY[c.source] ?? 40;
  if (v.status === "confirmed") score += 20;
  return score;
}

function pickBestConfirmed(
  candidates: SalonProviderCandidate[],
  validations: SalonProviderValidation[],
): { confirmed?: SalonProviderValidation; candidate?: SalonProviderCandidate } {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const byUrl = new Map(
    candidates.map((c) => [c.candidateUrl.toLowerCase().replace(/\/+$/, ""), c]),
  );

  let best: { v: SalonProviderValidation; c: SalonProviderCandidate; score: number } | null =
    null;

  for (const v of validations) {
    if (!v.confirmed) continue;
    const c =
      (v.candidateId ? byId.get(v.candidateId) : undefined) ??
      byUrl.get(v.candidateUrl.toLowerCase().replace(/\/+$/, ""));
    if (!c) continue;
    const score = scoreValidation(v, c);
    if (!best || score > best.score) {
      best = { v, c, score };
    }
  }

  if (!best) return {};
  return { confirmed: best.v, candidate: best.c };
}

function confirmedToBookingFields(
  v: SalonProviderValidation,
  c: SalonProviderCandidate,
): ConfirmedBookingFields {
  const source = mapCandidateSourceToBookingSource(c.source);
  const url = v.finalUrl ?? v.candidateUrl;
  const conf = Math.round(Math.min(100, v.confidence * 100));
  const evidence = [
    `validated:${v.status}`,
    ...v.positiveMarkers.slice(0, 4).map((m) => `marker:${m}`),
    `providerSource: ${source}`,
  ];
  const fields: ConfirmedBookingFields = {
    bookingProvider: v.provider,
    bookingProviderLabel: v.providerLabel,
    bookingUrl: url,
    bookingProviderConfidence: conf,
    bookingProviderEvidence: evidence,
    bookingProviderSource: source,
  };
  if (v.provider === "glossgenius") {
    fields.ggValidationStatus = mapValidationToGgStatus(v.status);
    fields.ggValidatedUrl = url;
  }
  return fields;
}

export async function runSalonProviderDiscoveryPipeline(
  input: SalonProviderPipelineInput,
): Promise<SalonProviderPipelineResult> {
  const linkTrailUrlsScanned = uniqueUrls(input.linkTrailUrls);
  const directUrlsScanned = uniqueUrls(input.directUrls).filter((u) => !isLinkInBioUrl(u));
  const linkInBioFetched = linkTrailUrlsScanned.length > 0;

  const discoverInput: DiscoverCandidatesInput = {
    prospectId: input.prospectId,
    instagramHandle: input.instagramHandle,
    displayName: input.displayName,
    website: input.website,
    bio: input.bio,
    directUrls: directUrlsScanned,
    linkTrailUrls: linkTrailUrlsScanned,
    text: input.text,
  };

  const urlCandidates = discoverUrlCandidates(discoverInput);
  const hints = {
    handle: input.instagramHandle.replace(/^@+/, ""),
    displayName: input.displayName ?? undefined,
  };

  const validations: SalonProviderValidation[] = [];
  for (const c of urlCandidates) {
    validations.push(await validateProviderCandidate(c, hints));
  }

  let allCandidates = [...urlCandidates];
  let best = pickBestConfirmed(allCandidates, validations);

  if (!best.confirmed && input.enableGeneratedFallback !== false) {
    const generated = discoverGeneratedCandidates(discoverInput);
    const ggHandleAttempted = generated.some((g) => g.source === "handle_guess");
    const ggDisplayAttempted = generated.some((g) => g.source === "display_guess");

    for (const c of generated) {
      const v = await validateProviderCandidate(c, hints);
      validations.push(v);
      allCandidates.push(c);
    }

    best = pickBestConfirmed(allCandidates, validations);

    const diagnostics: ProviderValidationDiagnostics = {
      candidates: allCandidates,
      validations,
      confirmed: best.confirmed,
    };

    if (!best.confirmed) {
      return emptyResult({
        directUrlsScanned,
        linkTrailUrlsScanned,
        linkInBioFetched,
        ggHandleAttempted,
        ggDisplayAttempted,
        ggCheckedUrls: generated.map((g) => g.candidateUrl),
        providerResolverReason: "no_confirmed_provider",
        diagnostics,
      });
    }

    const fields = confirmedToBookingFields(best.confirmed, best.candidate!);
    return buildSuccessResult({
      fields,
      directUrlsScanned,
      linkTrailUrlsScanned,
      linkInBioFetched,
      providerDetectedFromDirect: !best.candidate!.generated && best.candidate!.source === "direct_url",
      providerDetectedFromLinkTrail:
        !best.candidate!.generated && best.candidate!.source === "link_in_bio",
      ggHandleAttempted,
      ggDisplayAttempted,
      ggCheckedUrls: generated.map((g) => g.candidateUrl),
      providerResolverReason: best.candidate!.generated
        ? best.candidate!.source === "display_guess"
          ? "gg_display_confirmed"
          : "gg_handle_confirmed"
        : "url_candidate_confirmed",
      diagnostics,
      allCandidates,
    });
  }

  const diagnostics: ProviderValidationDiagnostics = {
    candidates: allCandidates,
    validations,
    confirmed: best.confirmed,
  };

  if (!best.confirmed) {
    return emptyResult({
      directUrlsScanned,
      linkTrailUrlsScanned,
      linkInBioFetched,
      ggHandleAttempted: false,
      ggDisplayAttempted: false,
      ggCheckedUrls: [],
      providerResolverReason: "no_confirmed_provider",
      diagnostics,
    });
  }

  const fields = confirmedToBookingFields(best.confirmed, best.candidate!);
  return buildSuccessResult({
    fields,
    directUrlsScanned,
    linkTrailUrlsScanned,
    linkInBioFetched,
    providerDetectedFromDirect:
      !best.candidate!.generated && best.candidate!.source === "direct_url",
    providerDetectedFromLinkTrail:
      !best.candidate!.generated && best.candidate!.source === "link_in_bio",
    ggHandleAttempted: false,
    ggDisplayAttempted: false,
    ggCheckedUrls: allCandidates
      .filter((c) => c.provider === "glossgenius")
      .map((c) => c.candidateUrl),
    providerResolverReason: "url_candidate_confirmed",
    diagnostics,
    allCandidates,
  });
}

function emptyResult(args: {
  directUrlsScanned: string[];
  linkTrailUrlsScanned: string[];
  linkInBioFetched: boolean;
  ggHandleAttempted: boolean;
  ggDisplayAttempted: boolean;
  ggCheckedUrls: string[];
  providerResolverReason: string;
  diagnostics: ProviderValidationDiagnostics;
}): SalonProviderPipelineResult {
  return {
    providerDiscoveryDebug: {
      directUrlsScanned: args.directUrlsScanned,
      linkTrailUrlsScanned: args.linkTrailUrlsScanned,
      linkInBioFetched: args.linkInBioFetched,
      providerDetectedFromDirect: false,
      providerDetectedFromLinkTrail: false,
      ggHandleAttempted: args.ggHandleAttempted,
      ggDisplayAttempted: args.ggDisplayAttempted,
      ggCheckedUrls: args.ggCheckedUrls,
      providerResolverReason: args.providerResolverReason,
      providerValidation: args.diagnostics,
    },
    ggResolverStatus: args.ggHandleAttempted ? "attempted_not_found" : "not_attempted",
    ggValidationStatus: "not_attempted",
    ggCheckedUrls: args.ggCheckedUrls,
    ggCandidateUrls: args.ggCheckedUrls,
  };
}

function buildSuccessResult(args: {
  fields: ConfirmedBookingFields;
  directUrlsScanned: string[];
  linkTrailUrlsScanned: string[];
  linkInBioFetched: boolean;
  providerDetectedFromDirect: boolean;
  providerDetectedFromLinkTrail: boolean;
  ggHandleAttempted: boolean;
  ggDisplayAttempted: boolean;
  ggCheckedUrls: string[];
  providerResolverReason: string;
  diagnostics: ProviderValidationDiagnostics;
  allCandidates: SalonProviderCandidate[];
}): SalonProviderPipelineResult {
  const { fields } = args;
  return {
    bookingProvider: fields.bookingProvider,
    bookingProviderLabel: fields.bookingProviderLabel,
    bookingUrl: fields.bookingUrl,
    bookingProviderConfidence: fields.bookingProviderConfidence,
    bookingProviderEvidence: fields.bookingProviderEvidence,
    bookingProviderSource: fields.bookingProviderSource as BookingProviderSource,
    ggValidationStatus: fields.ggValidationStatus as GgValidationStatus | undefined,
    ggValidatedUrl: fields.ggValidatedUrl,
    ggCheckedUrls: args.ggCheckedUrls,
    ggCandidateUrls: args.allCandidates
      .filter((c) => c.provider === "glossgenius")
      .map((c) => c.candidateUrl),
    providerDiscoveryDebug: {
      directUrlsScanned: args.directUrlsScanned,
      linkTrailUrlsScanned: args.linkTrailUrlsScanned,
      linkInBioFetched: args.linkInBioFetched,
      providerDetectedFromDirect: args.providerDetectedFromDirect,
      providerDetectedFromLinkTrail: args.providerDetectedFromLinkTrail,
      ggHandleAttempted: args.ggHandleAttempted,
      ggDisplayAttempted: args.ggDisplayAttempted,
      ggCheckedUrls: args.ggCheckedUrls,
      providerResolverReason: args.providerResolverReason,
      providerValidation: args.diagnostics,
    },
    ggResolverStatus:
      fields.bookingProvider === "glossgenius" ? "confirmed_client_page" : "skipped_existing_provider",
    ggResolverReason: fields.ggValidationStatus ?? "confirmed",
    providerResolverReason: args.providerResolverReason,
  };
}

export async function validateProviderUrlDebug(
  url: string,
  hints?: { handle?: string; displayName?: string },
): Promise<SalonProviderValidation> {
  const { detectSalonBookingProvider } = await import("../provider-detector");
  const detection = detectSalonBookingProvider(url);
  const candidate: SalonProviderCandidate = {
    id: "debug",
    provider: detection?.provider ?? "unknown",
    providerLabel: detection?.providerLabel ?? "Unknown",
    candidateUrl: url,
    source: "direct_url",
    confidenceHint: 80,
    generated: false,
    createdAt: new Date().toISOString(),
  };
  if (candidate.provider === "unknown") {
    if (/glossgenius\.com/i.test(url)) {
      candidate.provider = "glossgenius";
      candidate.providerLabel = "GlossGenius";
    } else if (/vagaro\.com/i.test(url)) {
      candidate.provider = "vagaro";
      candidate.providerLabel = "Vagaro";
    } else if (/square/i.test(url)) {
      candidate.provider = "square";
      candidate.providerLabel = "Square Appointments";
    }
  }
  return validateProviderCandidate(candidate, hints);
}
