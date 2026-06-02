// lib/intelligence/salon/business-stack/collect-urls.ts

import type { ProspectRecord } from "@/lib/studios/prospects/types";
import { isLinkInBioUrl } from "../provider-detector";
import type { StackProspectInput } from "./types";

function pushUrl(out: string[], seen: Set<string>, raw?: string | null): void {
  const u = (raw ?? "").trim();
  if (!u || !u.startsWith("http")) return;
  const key = u.toLowerCase().replace(/\/+$/, "");
  if (seen.has(key)) return;
  seen.add(key);
  out.push(u);
}

export function uniqueHttpUrls(urls: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) pushUrl(out, seen, raw);
  return out;
}

/** Restore URL trail fields from Postgres JSON debug + booking columns (not dedicated columns). */
export function hydrateProspectUrlFields(prospect: ProspectRecord): ProspectRecord {
  const dbg = prospect.providerDiscoveryDebug;
  const linkTrailUrlsScanned = uniqueHttpUrls([
    ...(prospect.linkTrailUrlsScanned ?? []),
    ...(dbg?.linkTrailUrlsScanned ?? []),
    ...(dbg?.urlsScanned ?? []),
    ...(dbg?.directUrlsScanned ?? []),
    ...(dbg?.bioUrls ?? []),
    prospect.bestMatch?.url,
    prospect.bookingUrl,
    ...(prospect.allMatchedUrls ?? []).map((m) => m.url),
    ...(prospect.candidateUrlsTested ?? []),
  ]);

  const bestMatch =
    prospect.bestMatch ??
    (prospect.bookingUrl?.startsWith("http")
      ? {
          platform: prospect.bookingProvider ?? "unknown",
          url: prospect.bookingUrl,
          confidence: prospect.bookingProviderConfidence ?? 0,
          matchReason: "booking_url",
        }
      : null);

  return {
    ...prospect,
    linkTrailUrlsScanned,
    linkInBioUrl: prospect.linkInBioUrl ?? dbg?.externalUrl ?? undefined,
    bestMatch,
    providerDiscoveryDebug: {
      ...dbg,
      externalUrl: dbg?.externalUrl ?? bestMatch?.url ?? prospect.bookingUrl ?? null,
      urlsScanned: dbg?.urlsScanned?.length
        ? dbg.urlsScanned
        : linkTrailUrlsScanned,
    },
  };
}

type UrlSource = {
  website?: string | null;
  bioUrl?: string | null;
  bestMatchUrl?: string | null;
  bookingUrl?: string | null;
  linkInBioUrl?: string | null;
  linkTrailUrls?: string[];
  linkTrailUrlsScanned?: string[];
  candidateUrlsTested?: string[];
  allMatchedUrls?: Array<{ url: string } | string>;
  externalUrl?: string | null;
  providerDiscoveryDebug?: ProspectRecord["providerDiscoveryDebug"];
  instagramHandle?: string;
};

function resolveExternalUrl(
  dbg: ProspectRecord["providerDiscoveryDebug"],
  bestMatchUrl?: string | null,
): string | undefined {
  if (dbg?.externalUrl && dbg.externalUrl.startsWith("http")) {
    return dbg.externalUrl;
  }
  const fromBio = (dbg?.bioUrls ?? []).find((u) => u.startsWith("http"));
  if (fromBio) return fromBio;
  const fromDirect = (dbg?.directUrlsScanned ?? []).find((u) => u.startsWith("http"));
  if (fromDirect) return fromDirect;
  return bestMatchUrl?.startsWith("http") ? bestMatchUrl : undefined;
}

/** Gather every public URL we know for a prospect (trail, booking, debug scans, matches). */
export function collectStackUrls(source: UrlSource): {
  all: string[];
  direct: string[];
  linkInBio: string[];
} {
  const dbg = source.providerDiscoveryDebug;
  const handle = (source.instagramHandle ?? "").replace(/^@+/, "").trim();
  const igBio =
    source.bioUrl ??
    (handle ? `https://www.instagram.com/${handle}/` : undefined);

  const externalUrl = source.externalUrl ?? resolveExternalUrl(dbg, source.bestMatchUrl);

  const directCandidates: Array<string | null | undefined> = [
    externalUrl,
    source.bookingUrl,
    source.bestMatchUrl,
    source.website,
    ...(dbg?.directUrlsScanned ?? []),
    ...(dbg?.urlsScanned ?? []),
    ...(dbg?.bioUrls ?? []),
    ...(dbg?.linkTrailUrlsScanned ?? []).filter((u) => !isLinkInBioUrl(u)),
    ...(source.candidateUrlsTested ?? []),
    ...(source.allMatchedUrls ?? []).map((u) =>
      typeof u === "string" ? u : u.url,
    ),
  ];

  const linkCandidates: Array<string | null | undefined> = [
    source.linkInBioUrl,
    igBio,
    ...(source.linkTrailUrlsScanned ?? []),
    ...(source.linkTrailUrls ?? []),
    ...(dbg?.linkTrailUrlsScanned ?? []),
    ...(dbg?.ggCheckedUrls ?? []),
  ];

  const direct: string[] = [];
  const linkInBio: string[] = [];

  const directSeen = new Set<string>();
  const linkSeen = new Set<string>();
  for (const u of directCandidates) {
    pushUrl(direct, directSeen, u);
  }
  for (const u of linkCandidates) {
    pushUrl(linkInBio, linkSeen, u);
  }

  const directFiltered = direct.filter((u) => !isLinkInBioUrl(u));
  const linkFiltered = uniqueHttpUrls([
    ...linkInBio,
    ...direct.filter((u) => isLinkInBioUrl(u)),
  ]);

  return {
    all: uniqueHttpUrls([...directFiltered, ...linkFiltered]),
    direct: uniqueHttpUrls(directFiltered),
    linkInBio: linkFiltered,
  };
}

export function prospectRecordToStackInput(prospect: ProspectRecord): StackProspectInput {
  const hydrated = hydrateProspectUrlFields(prospect);
  const dbg = hydrated.providerDiscoveryDebug;
  const bestUrl = hydrated.bestMatch?.url ?? hydrated.bookingUrl ?? undefined;
  const websiteOnly =
    hydrated.bestMatch?.platform === "website" ? hydrated.bestMatch.url : undefined;

  const urls = collectStackUrls({
    website: websiteOnly,
    externalUrl: resolveExternalUrl(dbg, bestUrl),
    bioUrl: hydrated.linkInBioUrl,
    bestMatchUrl: bestUrl,
    bookingUrl: hydrated.bookingUrl,
    linkInBioUrl: hydrated.linkInBioUrl,
    linkTrailUrls: hydrated.linkTrailUrlsScanned,
    linkTrailUrlsScanned: hydrated.linkTrailUrlsScanned,
    candidateUrlsTested: hydrated.candidateUrlsTested,
    allMatchedUrls: hydrated.allMatchedUrls,
    providerDiscoveryDebug: dbg,
    instagramHandle: hydrated.identity.handle,
  });

  return {
    prospectId: hydrated.prospectId,
    instagramHandle: hydrated.identity.handle,
    displayName: hydrated.identity.name,
    website: websiteOnly ?? undefined,
    bioUrl: hydrated.linkInBioUrl ?? undefined,
    bestMatchUrl: bestUrl,
    bookingUrl: hydrated.bookingUrl ?? undefined,
    linkInBioUrl: hydrated.linkInBioUrl ?? undefined,
    linkTrailUrls: urls.linkInBio,
    linkTrailUrlsScanned: hydrated.linkTrailUrlsScanned,
    allMatchedUrls: urls.all.map((url) => ({ url })),
    bookingProvider: hydrated.bookingProvider,
    bookingProviderConfidence: hydrated.bookingProviderConfidence,
    bookingProviderSource: hydrated.bookingProviderSource,
    collectedUrls: urls.all,
    collectedDirectUrls: urls.direct,
    collectedLinkUrls: urls.linkInBio,
  };
}
