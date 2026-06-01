// lib/intelligence/salon/public-presence/discovery-engine.ts
// Public presence resolver: identity → direct/link → search → website crawl → GG fallback.

import {
  detectBestSalonBookingProvider,
  detectSalonBookingProvider,
  isLinkInBioUrl,
} from "../provider-detector";
import {
  resolveGlossGeniusFromHandle,
  legacyGlossGeniusEnrichFields,
  collectGlossGeniusCandidates,
} from "../glossgenius-handle-resolver";
import {
  validateGlossGeniusPage,
  mapValidationSource,
  type GgValidationStatus,
} from "../glossgenius-page-validator";
import type { BookingProviderSource } from "../enrich-booking-provider";
import {
  buildSalonIdentityPacket,
  prospectToPublicPresenceInput,
} from "./identity-extractor";
import { classifySalonUrl } from "./url-classifier";
import { searchSalonPublicPresence, getSearchProviderStatus } from "./search-provider";
import type {
  PublicPresenceProspectInput,
  SalonPublicPresenceDiscoveryResult,
  SalonPublicPresenceResult,
  SalonPublicPresenceSource,
  SalonPublicPresenceBestProvider,
} from "./types";
import type { ProspectRecord } from "@/lib/studios/prospects/types";

const CONFIRMED_DIRECT_MIN = 90;
const HOMEPAGE_TIMEOUT_MS = 6_000;
const HOMEPAGE_MAX_BYTES = 500_000;
const LINK_REGEX = /href\s*=\s*["']([^"']+)["']/gi;

export type DiscoverSalonOptions = {
  forceSearch?: boolean;
  enableSearch?: boolean;
  enableGgFallback?: boolean;
  enableWebsiteCrawl?: boolean;
  maxSearchQueries?: number;
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

function makePresenceRow(
  partial: Omit<SalonPublicPresenceResult, "id" | "discoveredAt"> & { id?: string },
): SalonPublicPresenceResult {
  const slug = partial.url.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  return {
    id: partial.id ?? `pr-${partial.prospectId ?? "x"}-${slug}`,
    discoveredAt: new Date().toISOString(),
    ...partial,
  };
}

function sourceToBookingSource(
  source: SalonPublicPresenceSource,
): BookingProviderSource | "google_search" | "website_crawl" | "public_web" {
  switch (source) {
    case "ig_direct_url":
      return "direct_url";
    case "link_in_bio":
      return "link_in_bio";
    case "google_search":
    case "google_business":
      return "google_search";
    case "website_crawl":
      return "website_crawl";
    case "public_web":
      return "public_web";
    case "provider_guess":
      return "handle_derived";
    default:
      return "unknown";
  }
}

type CandidateProvider = SalonPublicPresenceBestProvider & {
  validated: boolean;
};

async function validateGgCandidate(
  url: string,
  source: SalonPublicPresenceSource,
  hints: { handle: string; displayName?: string },
): Promise<{
  ok: boolean;
  bookingUrl?: string;
  confidence: number;
  ggValidationStatus: GgValidationStatus;
  evidence: string[];
}> {
  const validation = await validateGlossGeniusPage({
    url,
    slugHint: url,
    displayNameHint: hints.displayName,
    handleHint: hints.handle,
    discoverySource: mapValidationSource(sourceToBookingSource(source) as BookingProviderSource),
  });
  if (!validation.confirmed) {
    return {
      ok: false,
      confidence: 0,
      ggValidationStatus: validation.status,
      evidence: [validation.reason],
    };
  }
  return {
    ok: true,
    bookingUrl: validation.finalUrl,
    confidence: validation.suggestedConfidence,
    ggValidationStatus: validation.status,
    evidence: [
      `ggValidation: ${validation.status}`,
      ...validation.positiveMarkers.map((m) => `+${m}`),
      validation.reason,
    ],
  };
}

async function crawlHomepageForBookingLinks(
  siteUrl: string,
): Promise<{ urls: string[]; error?: string }> {
  try {
    const res = await fetch(siteUrl, {
      signal: AbortSignal.timeout(HOMEPAGE_TIMEOUT_MS),
      headers: { "User-Agent": "FamtreeSalonPresence/1.0 (+public discovery)" },
      redirect: "follow",
    });
    if (!res.ok) return { urls: [], error: `http_${res.status}` };
    const buf = await res.arrayBuffer();
    if (buf.byteLength > HOMEPAGE_MAX_BYTES) {
      return { urls: [], error: "response_too_large" };
    }
    const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    const base = new URL(siteUrl);
    const found: string[] = [];
    let m: RegExpExecArray | null;
    LINK_REGEX.lastIndex = 0;
    while ((m = LINK_REGEX.exec(html)) !== null) {
      const href = m[1]?.trim();
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) continue;
      try {
        const abs = new URL(href, base).href;
        if (abs.startsWith("http")) found.push(abs);
      } catch {
        // skip
      }
    }
    return { urls: uniqueUrls(found) };
  } catch (e) {
    return {
      urls: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function detectFromUrls(
  urls: string[],
  text: string,
  source: SalonPublicPresenceSource,
  prospectId?: string,
): { rows: SalonPublicPresenceResult[]; best?: CandidateProvider } {
  const nonLib = urls.filter((u) => !isLinkInBioUrl(u));
  const detection = detectBestSalonBookingProvider({
    urls: nonLib,
    text,
    linkPageLinks: urls,
  });
  const rows: SalonPublicPresenceResult[] = [];
  if (!detection || detection.provider === "unknown") return { rows };

  const conf =
    source === "ig_direct_url"
      ? 0.97
      : source === "link_in_bio"
        ? 0.92
        : 0.88;

  const row = makePresenceRow({
    prospectId,
    source,
    url: detection.bookingUrl ?? nonLib[0] ?? urls[0],
    urlType: "booking_provider",
    provider: detection.provider,
    providerLabel: detection.providerLabel,
    confidence: conf,
    evidence: [...detection.evidence, `source:${source}`],
  });
  rows.push(row);

  return {
    rows,
    best: {
      provider: detection.provider,
      providerLabel: detection.providerLabel,
      bookingUrl: detection.bookingUrl ?? row.url,
      confidence: Math.round(conf * 100),
      source,
      evidence: row.evidence,
      validated: detection.provider !== "glossgenius",
    },
  };
}

function pickBestCandidate(
  candidates: CandidateProvider[],
): CandidateProvider | undefined {
  const sorted = [...candidates].sort((a, b) => {
    const pri = (c: CandidateProvider) => {
      if (c.source === "ig_direct_url") return 100;
      if (c.source === "link_in_bio") return 90;
      if (c.source === "website_crawl") return 75;
      if (c.source === "google_search" || c.source === "google_business") return 70;
      if (c.source === "public_web") return 65;
      if (c.source === "provider_guess") return 40;
      return 50;
    };
    const p = pri(b) - pri(a);
    if (p !== 0) return p;
    return b.confidence - a.confidence;
  });
  return sorted[0];
}

function existingConfirmedProvider(
  input: PublicPresenceProspectInput,
): CandidateProvider | undefined {
  const conf = input.bookingProviderConfidence ?? 0;
  const src = input.bookingProviderSource;
  if (!input.bookingProvider || input.bookingProvider === "unknown") return undefined;
  if (conf < CONFIRMED_DIRECT_MIN) return undefined;
  if (
    src !== "direct_url" &&
    src !== "link_in_bio" &&
    src !== "link_trail"
  ) {
    return undefined;
  }
  const presenceSource: SalonPublicPresenceSource =
    src === "link_in_bio" || src === "link_trail" ? "link_in_bio" : "ig_direct_url";
  return {
    provider: input.bookingProvider,
    providerLabel: input.bookingProvider,
    bookingUrl: input.bookingUrl ?? "",
    confidence: conf,
    source: presenceSource,
    evidence: ["preserved_existing_confirmed_provider"],
    validated: true,
  };
}

export async function discoverSalonPublicPresence(
  prospect: PublicPresenceProspectInput | ProspectRecord,
  options?: DiscoverSalonOptions,
): Promise<SalonPublicPresenceDiscoveryResult> {
  const input =
    "identity" in prospect
      ? prospectToPublicPresenceInput(prospect as ProspectRecord)
      : prospect;

  const identity = buildSalonIdentityPacket(input);
  const handle = (identity.instagramHandle ?? "").replace(/^@+/, "").trim();
  const text = [identity.displayName, identity.bio, identity.categoryHint]
    .filter(Boolean)
    .join(" ");

  const diagnostics: SalonPublicPresenceDiscoveryResult["diagnostics"] = {
    directUrlsScanned: 0,
    linkTrailUrlsScanned: 0,
    searchQueriesRun: 0,
    searchResultsScanned: 0,
    providerUrlsFound: 0,
    websiteUrlsFound: 0,
    ggFallbackAttempted: false,
    ggFallbackFound: false,
    searchProvider: getSearchProviderStatus().provider,
    searchMessage: getSearchProviderStatus().message,
    errors: [],
  };

  const presenceResults: SalonPublicPresenceResult[] = [];
  const providerCandidates: CandidateProvider[] = [];

  const preserved = existingConfirmedProvider(input);
  if (preserved?.bookingUrl) {
    providerCandidates.push(preserved);
    presenceResults.push(
      makePresenceRow({
        prospectId: identity.prospectId,
        source: preserved.source,
        url: preserved.bookingUrl,
        urlType: "booking_provider",
        provider: preserved.provider,
        providerLabel: preserved.providerLabel,
        confidence: preserved.confidence / 100,
        evidence: preserved.evidence,
      }),
    );
  }

  const directUrls = uniqueUrls([
    input.website,
    input.bioUrl,
    input.bestMatchUrl,
    input.bookingUrl,
    ...(input.allMatchedUrls ?? []).map((u) => (typeof u === "string" ? u : u.url)),
  ]).filter((u) => !isLinkInBioUrl(u));

  const linkTrailUrls = uniqueUrls([
    ...(input.linkTrailUrlsScanned ?? []),
    ...(input.linkTrailUrls ?? []),
    input.linkInBioUrl,
    ...(input.allMatchedUrls ?? []).map((u) => (typeof u === "string" ? u : u.url)),
  ]);

  diagnostics.directUrlsScanned = directUrls.length;
  diagnostics.linkTrailUrlsScanned = linkTrailUrls.length;

  if (!preserved) {
    const directHit = detectFromUrls(
      directUrls,
      text,
      "ig_direct_url",
      identity.prospectId,
    );
    presenceResults.push(...directHit.rows);
    if (directHit.best) {
      if (directHit.best.provider === "glossgenius") {
        const v = await validateGgCandidate(
          directHit.best.bookingUrl,
          "ig_direct_url",
          { handle, displayName: identity.displayName },
        );
        if (v.ok && v.bookingUrl) {
          directHit.best.bookingUrl = v.bookingUrl;
          directHit.best.confidence = v.confidence;
          directHit.best.validated = true;
          directHit.best.evidence = [...directHit.best.evidence, ...v.evidence];
          providerCandidates.push(directHit.best);
          diagnostics.providerUrlsFound++;
        }
      } else {
        providerCandidates.push(directHit.best);
        diagnostics.providerUrlsFound++;
      }
    }

    if (!providerCandidates.length) {
      const trailHit = detectFromUrls(
        linkTrailUrls,
        text,
        "link_in_bio",
        identity.prospectId,
      );
      presenceResults.push(...trailHit.rows);
      if (trailHit.best) {
        if (trailHit.best.provider === "glossgenius") {
          const v = await validateGgCandidate(
            trailHit.best.bookingUrl,
            "link_in_bio",
            { handle, displayName: identity.displayName },
          );
          if (v.ok && v.bookingUrl) {
            trailHit.best.bookingUrl = v.bookingUrl;
            trailHit.best.confidence = v.confidence;
            trailHit.best.validated = true;
            trailHit.best.evidence = [...trailHit.best.evidence, ...v.evidence];
            providerCandidates.push(trailHit.best);
            diagnostics.providerUrlsFound++;
          }
        } else {
          providerCandidates.push(trailHit.best);
          diagnostics.providerUrlsFound++;
        }
      }
    }
  }

  const shouldSearch =
    (options?.forceSearch || options?.enableSearch) &&
    (!providerCandidates.length || options?.forceSearch);

  if (shouldSearch) {
    const search = await searchSalonPublicPresence(identity, {
      maxQueries: options?.maxSearchQueries ?? 4,
    });
    diagnostics.searchQueriesRun = search.diagnostics.queriesAttempted;
    diagnostics.searchResultsScanned = search.results.length;
    if (search.diagnostics.errors.length) {
      diagnostics.errors.push(...search.diagnostics.errors);
    }

    for (const hit of search.results) {
      const classified = classifySalonUrl(hit.url, hit.title, hit.snippet);
      const row = makePresenceRow({
        prospectId: identity.prospectId,
        source: "google_search",
        url: hit.url,
        title: hit.title,
        snippet: hit.snippet,
        urlType: classified.urlType,
        provider: classified.provider,
        providerLabel: classified.providerLabel,
        confidence: classified.urlType === "booking_provider" ? 0.8 : 0.35,
        evidence: [`query:${hit.query}`, `classified:${classified.urlType}`],
      });
      presenceResults.push(row);

      if (classified.urlType === "booking_provider" && classified.provider) {
        diagnostics.providerUrlsFound++;
        let bookingUrl = classified.bookingUrl ?? hit.url;
        let confidence = 78;
        let validated = classified.provider !== "glossgenius";
        const evidence = [`search:${hit.query}`, hit.url];

        if (classified.provider === "glossgenius") {
          const v = await validateGgCandidate(bookingUrl, "google_search", {
            handle,
            displayName: identity.displayName,
          });
          if (!v.ok) continue;
          bookingUrl = v.bookingUrl!;
          confidence = v.confidence;
          validated = true;
          evidence.push(...v.evidence);
        }

        providerCandidates.push({
          provider: classified.provider,
          providerLabel: classified.providerLabel ?? classified.provider,
          bookingUrl,
          confidence,
          source: "google_search",
          evidence,
          validated,
        });
      } else if (classified.urlType === "business_website" && options?.enableWebsiteCrawl !== false) {
        diagnostics.websiteUrlsFound++;
        const crawl = await crawlHomepageForBookingLinks(hit.url);
        if (crawl.error) diagnostics.errors.push(`crawl:${hit.url}:${crawl.error}`);
        for (const link of crawl.urls.slice(0, 40)) {
          const det = detectSalonBookingProvider(link);
          if (!det || det.provider === "unknown") continue;
          const bookingUrl = det.bookingUrl ?? link;
          let confidence = 85;
          let validated = det.provider !== "glossgenius";
          const evidence = [`website_crawl:${hit.url}`, link];

          if (det.provider === "glossgenius") {
            const v = await validateGgCandidate(bookingUrl, "website_crawl", {
              handle,
              displayName: identity.displayName,
            });
            if (!v.ok) continue;
            confidence = v.confidence;
            validated = true;
            evidence.push(...v.evidence);
          }

          presenceResults.push(
            makePresenceRow({
              prospectId: identity.prospectId,
              source: "website_crawl",
              url: bookingUrl,
              urlType: "booking_provider",
              provider: det.provider,
              providerLabel: det.providerLabel,
              confidence: confidence / 100,
              evidence,
            }),
          );
          providerCandidates.push({
            provider: det.provider,
            providerLabel: det.providerLabel,
            bookingUrl,
            confidence,
            source: "website_crawl",
            evidence,
            validated,
          });
          diagnostics.providerUrlsFound++;
          break;
        }
      }
    }
  }

  if (
    !providerCandidates.length &&
    options?.enableGgFallback !== false &&
    handle
  ) {
    diagnostics.ggFallbackAttempted = true;
    try {
      const ggResult = await resolveGlossGeniusFromHandle(
        {
          instagramHandle: handle,
          displayName: identity.displayName,
          website: input.website,
          bio: identity.bio,
        },
        { publicUrls: linkTrailUrls },
      );
      const gg = legacyGlossGeniusEnrichFields(ggResult);
      if (gg && ggResult.ggValidationStatus === "confirmed_client_page") {
        diagnostics.ggFallbackFound = true;
        const candidates = collectGlossGeniusCandidates({
          instagramHandle: handle,
          displayName: identity.displayName,
        });
        providerCandidates.push({
          provider: gg.provider,
          providerLabel: gg.providerLabel,
          bookingUrl: gg.bookingUrl,
          confidence: gg.providerConfidence,
          source: "provider_guess",
          evidence: gg.evidence,
          validated: true,
          ggValidationStatus: ggResult.ggValidationStatus,
          ggValidatedUrl: ggResult.ggValidatedUrl,
          ggCandidateUrls: ggResult.ggCandidateUrls ?? candidates.map((c) => c.url),
        });
        presenceResults.push(
          makePresenceRow({
            prospectId: identity.prospectId,
            source: "provider_guess",
            url: gg.bookingUrl,
            urlType: "booking_provider",
            provider: gg.provider,
            providerLabel: gg.providerLabel,
            confidence: 0.72,
            evidence: [...gg.evidence, "gg_fallback"],
          }),
        );
        diagnostics.providerUrlsFound++;
      } else if (ggResult.checkedUrls?.length) {
        diagnostics.errors.push(ggResult.reason ?? "gg_fallback_not_confirmed");
      }
    } catch (e) {
      diagnostics.errors.push(
        `gg_fallback: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  const best = pickBestCandidate(
    providerCandidates.filter((c) => c.validated && c.confidence > 0),
  );

  if (preserved && best && best.source !== preserved.source && best.confidence < preserved.confidence) {
    return {
      prospectId: identity.prospectId,
      identity,
      presenceResults,
      bestProvider: preserved,
      diagnostics,
    };
  }

  return {
    prospectId: identity.prospectId,
    identity,
    presenceResults,
    bestProvider: best,
    diagnostics,
  };
}

/** Map public presence discovery to legacy salon provider discovery fields. */
export function mapDiscoveryToBookingFields(
  discovery: SalonPublicPresenceDiscoveryResult,
): {
  bookingProvider?: string;
  bookingProviderLabel?: string;
  bookingUrl?: string;
  bookingProviderConfidence?: number;
  bookingProviderEvidence?: string[];
  bookingProviderSource?: BookingProviderSource | "google_search" | "website_crawl" | "public_web";
  providerResolverReason?: string;
  ggCandidateUrls?: string[];
  ggValidatedUrl?: string;
  ggValidationStatus?: GgValidationStatus;
} {
  const best = discovery.bestProvider;
  if (!best) {
    return {
      providerResolverReason:
        discovery.diagnostics.ggFallbackAttempted
          ? "no_provider_after_discovery"
          : "no_provider",
    };
  }
  return {
    bookingProvider: best.provider,
    bookingProviderLabel: best.providerLabel,
    bookingUrl: best.bookingUrl,
    bookingProviderConfidence: best.confidence,
    bookingProviderEvidence: best.evidence,
    bookingProviderSource: sourceToBookingSource(best.source),
    providerResolverReason: `public_presence:${best.source}`,
    ggCandidateUrls: best.ggCandidateUrls,
    ggValidatedUrl: best.ggValidatedUrl,
    ggValidationStatus: best.ggValidationStatus as GgValidationStatus | undefined,
  };
}
