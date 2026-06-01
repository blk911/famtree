// lib/intelligence/salon/provider-detection-diagnostics.ts
// Explain why booking providers were or were not detected from public link trails.

import {
  detectBestSalonBookingProvider,
  detectSalonBookingProvider,
  getBookingProviderLabel,
  isLinkInBioUrl,
  type SalonBookingProvider,
} from "./provider-detector";
import {
  glossGeniusResolverStatus,
  GLOSSGENIUS_RESOLVER_STATUS_LABELS,
  type BookingProviderSource,
  type GlossGeniusResolverStatus,
} from "./enrich-booking-provider";
import { isSalonImportCandidate } from "./import-candidate";
import type { ProspectRecord } from "@/lib/studios/prospects/types";

export type { GlossGeniusResolverStatus };

export { GLOSSGENIUS_RESOLVER_STATUS_LABELS as GLOSSGENIUS_STATUS_LABELS } from "./enrich-booking-provider";

export type ProviderDetectionOutcome =
  | "detected"
  | "no_public_url"
  | "link_page_not_fetched"
  | "no_provider_found"
  | "unsupported_provider";

export type ProviderDetectionFilterKey =
  | "all"
  | "detected"
  | "no_public_url"
  | "link_page_not_fetched"
  | "no_provider_found";

export const PROVIDER_DETECTION_REASON_LABELS: Record<
  Exclude<ProviderDetectionOutcome, "detected">,
  string
> = {
  no_public_url: "No public URL",
  link_page_not_fetched: "Link page not fetched",
  no_provider_found: "No provider URL found",
  unsupported_provider: "Unsupported provider",
};

export type ProspectProviderDetectionDiagnostics = {
  bioUrl: string;
  bestUrl?: string;
  linkInBioUrl?: string;
  linkTrailUrlsScanned: string[];
  linkInBioPageFetched: boolean;
  provider?: SalonBookingProvider | string;
  providerLabel?: string;
  evidence: string[];
  outcome: ProviderDetectionOutcome;
  reasonLabel: string;
  filterKey: ProviderDetectionFilterKey;
  hasAnyUrl: boolean;
  hasLinkInBioUrl: boolean;
  glossGeniusStatus: GlossGeniusResolverStatus;
  glossGeniusStatusLabel: string;
  bookingProviderSource?: BookingProviderSource;
};

const BOOKING_HINT_HOSTS = [
  "calendly.com",
  "gettimely.com",
  "setmore.com",
  "appointy.com",
  "simplybook.me",
  "phorest.com",
  "mindbodyonline.com",
  "mindbody.io",
];

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

function evidenceToText(evidence: ProspectRecord["evidence"] = []): string {
  return evidence
    .map((e) => (typeof e === "string" ? e : [e.label, e.url, e.type].filter(Boolean).join(" ")))
    .join(" ");
}

function findLinkInBioUrl(urls: string[]): string | undefined {
  return urls.find((u) => isLinkInBioUrl(u));
}

function inferLinkInBioFetched(
  linkInBioUrl: string | undefined,
  prospect: ProspectRecord,
  linkTrailFromPage: string[],
): boolean {
  if (prospect.linkInBioPageFetched === true) return true;
  if (!linkInBioUrl) return false;

  const confirmed = prospect.allMatchedUrls.some(
    (m) => m.url === linkInBioUrl || isLinkInBioUrl(m.url),
  );
  if (confirmed) return true;

  if (linkTrailFromPage.length > 0) return true;

  const rejected = (prospect.rejectedCandidateUrls ?? []).find(
    (r) => r.url === linkInBioUrl || isLinkInBioUrl(r.url),
  );
  if (rejected) {
    return !["fetch_error", "not_found"].includes(rejected.reason);
  }

  const tested = (prospect.candidateUrlsTested ?? []).some(
    (u) => u === linkInBioUrl || isLinkInBioUrl(u),
  );
  return tested;
}

function toBookingProviderSource(
  src?: ProspectRecord["bookingProviderSource"],
): BookingProviderSource | undefined {
  if (!src || src === "unknown") return src === "unknown" ? "unknown" : undefined;
  if (src === "link_trail") return "link_in_bio";
  return src as BookingProviderSource;
}

function parseBookingProviderSource(
  prospect: ProspectRecord,
): BookingProviderSource | undefined {
  if (prospect.bookingProviderSource) {
    return toBookingProviderSource(prospect.bookingProviderSource);
  }
  const line = (prospect.bookingProviderEvidence ?? []).find((e) =>
    e.startsWith("providerSource:"),
  );
  if (!line) return undefined;
  const raw = line.split(":")[1]?.trim();
  if (
    raw === "handle_derived" ||
    raw === "display_name_derived" ||
    raw === "direct_url" ||
    raw === "link_in_bio" ||
    raw === "link_trail"
  ) {
    return toBookingProviderSource(raw as ProspectRecord["bookingProviderSource"]);
  }
  return undefined;
}

function buildGlossGeniusDiagnostics(
  prospect: ProspectRecord,
  trailUrls: string[],
): Pick<
  ProspectProviderDetectionDiagnostics,
  "glossGeniusStatus" | "glossGeniusStatusLabel" | "bookingProviderSource"
> {
  const bookingProviderSource = parseBookingProviderSource(prospect);
  const status = glossGeniusResolverStatus(
    {
      bookingProvider: prospect.bookingProvider,
      bookingProviderSource,
      bookingUrl: prospect.bookingUrl,
    },
    trailUrls,
  );
  return {
    glossGeniusStatus: status,
    glossGeniusStatusLabel: GLOSSGENIUS_RESOLVER_STATUS_LABELS[status],
    bookingProviderSource,
  };
}

function hasUnsupportedBookingHost(urls: string[]): boolean {
  for (const url of urls) {
    const hay = url.toLowerCase();
    if (BOOKING_HINT_HOSTS.some((h) => hay.includes(h))) {
      if (!detectSalonBookingProvider(url)) return true;
    }
  }
  return false;
}

export function collectProspectTrailUrls(prospect: ProspectRecord): string[] {
  return uniqueUrls([
    prospect.bestMatch?.url,
    prospect.bookingUrl,
    ...(prospect.allMatchedUrls ?? []).map((m) => m.url),
    ...(prospect.candidateUrlsTested ?? []),
    ...(prospect.linkTrailUrlsScanned ?? []),
    ...(prospect.platforms ?? []).filter((p) => p.startsWith("http")),
  ]);
}

export function analyzeProspectProviderDetection(
  prospect: ProspectRecord,
): ProspectProviderDetectionDiagnostics {
  const handle = prospect.identity.handle;
  const bioUrl = handle
    ? `https://www.instagram.com/${handle.replace(/^@/, "")}/`
    : "";

  const linkTrailUrlsScanned = collectProspectTrailUrls(prospect);
  const bestUrl = prospect.bookingUrl ?? prospect.bestMatch?.url;
  const linkInBioUrl =
    prospect.linkInBioUrl ?? findLinkInBioUrl(linkTrailUrlsScanned);
  const linkTrailFromPage = prospect.linkTrailUrlsScanned ?? [];
  const linkInBioPageFetched = inferLinkInBioFetched(
    linkInBioUrl,
    prospect,
    linkTrailFromPage,
  );

  const hasAnyUrl = linkTrailUrlsScanned.length > 0;
  const hasLinkInBioUrl = Boolean(linkInBioUrl);

  const evidence = [
    ...(prospect.bookingProviderEvidence ?? []),
  ];

  const ggDiag = buildGlossGeniusDiagnostics(prospect, linkTrailUrlsScanned);

  if (prospect.bookingProvider && prospect.bookingProvider !== "unknown") {
    const handleMatch =
      prospect.bookingProvider === "glossgenius" &&
      ggDiag.bookingProviderSource === "handle_derived";
    return {
      bioUrl,
      bestUrl,
      linkInBioUrl,
      linkTrailUrlsScanned,
      linkInBioPageFetched,
      provider: prospect.bookingProvider,
      providerLabel: handleMatch
        ? "GlossGenius (Handle Match)"
        : (prospect.bookingProviderLabel ??
          getBookingProviderLabel(prospect.bookingProvider as SalonBookingProvider)),
      evidence,
      outcome: "detected",
      reasonLabel: "Provider detected",
      filterKey: "detected",
      hasAnyUrl,
      hasLinkInBioUrl,
      ...ggDiag,
    };
  }

  const liveDetection = detectBestSalonBookingProvider({
    urls: linkTrailUrlsScanned,
    text: evidenceToText(prospect.evidence),
    linkPageLinks: linkTrailFromPage,
  });

  if (liveDetection && liveDetection.provider !== "unknown") {
    return {
      bioUrl,
      bestUrl: liveDetection.bookingUrl ?? bestUrl,
      linkInBioUrl,
      linkTrailUrlsScanned,
      linkInBioPageFetched,
      provider: liveDetection.provider,
      providerLabel: liveDetection.providerLabel,
      evidence: [...evidence, ...liveDetection.evidence],
      outcome: "detected",
      reasonLabel: "Provider detected (from URL trail)",
      filterKey: "detected",
      hasAnyUrl,
      hasLinkInBioUrl,
      ...ggDiag,
    };
  }

  if (!hasAnyUrl) {
    return {
      bioUrl,
      bestUrl,
      linkInBioUrl,
      linkTrailUrlsScanned,
      linkInBioPageFetched,
      evidence,
      outcome: "no_public_url",
      reasonLabel: PROVIDER_DETECTION_REASON_LABELS.no_public_url,
      filterKey: "no_public_url",
      hasAnyUrl: false,
      hasLinkInBioUrl,
      ...ggDiag,
    };
  }

  if (hasLinkInBioUrl && !linkInBioPageFetched) {
    return {
      bioUrl,
      bestUrl,
      linkInBioUrl,
      linkTrailUrlsScanned,
      linkInBioPageFetched: false,
      evidence,
      outcome: "link_page_not_fetched",
      reasonLabel: PROVIDER_DETECTION_REASON_LABELS.link_page_not_fetched,
      filterKey: "link_page_not_fetched",
      hasAnyUrl,
      hasLinkInBioUrl,
      ...ggDiag,
    };
  }

  if (hasUnsupportedBookingHost(linkTrailUrlsScanned)) {
    return {
      bioUrl,
      bestUrl,
      linkInBioUrl,
      linkTrailUrlsScanned,
      linkInBioPageFetched,
      evidence,
      outcome: "unsupported_provider",
      reasonLabel: PROVIDER_DETECTION_REASON_LABELS.unsupported_provider,
      filterKey: "no_provider_found",
      hasAnyUrl,
      hasLinkInBioUrl,
      ...ggDiag,
    };
  }

  return {
    bioUrl,
    bestUrl,
    linkInBioUrl,
    linkTrailUrlsScanned,
    linkInBioPageFetched,
    evidence,
    outcome: "no_provider_found",
    reasonLabel: PROVIDER_DETECTION_REASON_LABELS.no_provider_found,
    filterKey: "no_provider_found",
    hasAnyUrl,
    hasLinkInBioUrl,
    ...ggDiag,
  };
}

export type ProviderDetectionSummary = {
  total: number;
  withAnyUrl: number;
  withLinkInBioUrl: number;
  linkInBioPagesFetched: number;
  providerDetected: number;
  glossgenius: number;
  vagaro: number;
  square: number;
  unknownNoProvider: number;
  ggDirect: number;
  ggLinkInBio: number;
  ggHandleMatch: number;
  ggDisplayMatch: number;
  importCandidates: number;
};

export function summarizeProviderDetection(
  prospects: ProspectRecord[],
): ProviderDetectionSummary {
  let withAnyUrl = 0;
  let withLinkInBioUrl = 0;
  let linkInBioPagesFetched = 0;
  let providerDetected = 0;
  let glossgenius = 0;
  let vagaro = 0;
  let square = 0;
  let unknownNoProvider = 0;
  let ggDirect = 0;
  let ggLinkInBio = 0;
  let ggHandleMatch = 0;
  let ggDisplayMatch = 0;
  let importCandidates = 0;

  for (const p of prospects) {
    const d = analyzeProspectProviderDetection(p);
    if (d.hasAnyUrl) withAnyUrl++;
    if (d.hasLinkInBioUrl) withLinkInBioUrl++;
    if (d.linkInBioPageFetched) linkInBioPagesFetched++;
    if (d.outcome === "detected") {
      providerDetected++;
      if (d.provider === "glossgenius") glossgenius++;
      else if (d.provider === "vagaro") vagaro++;
      else if (d.provider === "square") square++;
      if (d.glossGeniusStatus === "gg_direct") ggDirect++;
      if (d.glossGeniusStatus === "gg_link_in_bio") ggLinkInBio++;
      if (d.glossGeniusStatus === "gg_handle_match") ggHandleMatch++;
      if (d.glossGeniusStatus === "gg_display_match") ggDisplayMatch++;
    } else {
      unknownNoProvider++;
    }
    if (isSalonImportCandidate(p)) importCandidates++;
  }

  return {
    total: prospects.length,
    withAnyUrl,
    withLinkInBioUrl,
    linkInBioPagesFetched,
    providerDetected,
    glossgenius,
    vagaro,
    square,
    unknownNoProvider,
    ggDirect,
    ggLinkInBio,
    ggHandleMatch,
    ggDisplayMatch,
    importCandidates,
  };
}

export function matchesProviderDetectionFilter(
  diagnostics: ProspectProviderDetectionDiagnostics,
  filter: ProviderDetectionFilterKey,
): boolean {
  if (filter === "all") return true;
  return diagnostics.filterKey === filter;
}

export function buildProspectLinkTrailFields(input: {
  handle: string;
  bestMatchUrl?: string | null;
  allMatchedUrls?: Array<{ url: string }>;
  candidateUrlsTested?: string[];
  linkTrailUrls?: string[];
  rejectedCandidateUrls?: Array<{ url: string; platform: string; reason: string }>;
}): {
  linkInBioUrl?: string;
  linkInBioPageFetched?: boolean;
  linkTrailUrlsScanned?: string[];
} {
  const urls = uniqueUrls([
    input.bestMatchUrl,
    ...(input.allMatchedUrls ?? []).map((m) => m.url),
    ...(input.candidateUrlsTested ?? []),
    ...(input.linkTrailUrls ?? []),
  ]);
  const linkInBioUrl = findLinkInBioUrl(urls);
  const linkTrailUrlsScanned = uniqueUrls([
    ...urls,
    ...(input.linkTrailUrls ?? []),
  ]);

  let linkInBioPageFetched = false;
  if (linkInBioUrl) {
    const confirmed = (input.allMatchedUrls ?? []).some(
      (m) => m.url === linkInBioUrl || isLinkInBioUrl(m.url),
    );
    const rejected = (input.rejectedCandidateUrls ?? []).find(
      (r) => r.url === linkInBioUrl || isLinkInBioUrl(r.url),
    );
    linkInBioPageFetched =
      confirmed ||
      (input.linkTrailUrls ?? []).length > 0 ||
      Boolean(
        (input.candidateUrlsTested ?? []).some((u) => isLinkInBioUrl(u)) &&
          !rejected,
      );
  }

  return {
    linkInBioUrl,
    linkInBioPageFetched,
    linkTrailUrlsScanned,
  };
}
