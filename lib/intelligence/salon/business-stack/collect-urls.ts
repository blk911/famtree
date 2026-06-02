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

type UrlSource = {
  website?: string | null;
  bioUrl?: string | null;
  bestMatchUrl?: string | null;
  bookingUrl?: string | null;
  linkInBioUrl?: string | null;
  linkTrailUrls?: string[];
  linkTrailUrlsScanned?: string[];
  allMatchedUrls?: Array<{ url: string } | string>;
  externalUrl?: string | null;
  providerDiscoveryDebug?: ProspectRecord["providerDiscoveryDebug"];
  instagramHandle?: string;
};

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

  const directCandidates: Array<string | null | undefined> = [
    source.externalUrl,
    source.bookingUrl,
    source.bestMatchUrl,
    source.website,
    ...(dbg?.directUrlsScanned ?? []),
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

  const allSeen = new Set<string>();
  const all: string[] = [];
  const direct: string[] = [];
  const linkInBio: string[] = [];

  for (const u of directCandidates) {
    pushUrl(direct, allSeen, u);
  }
  for (const u of linkCandidates) {
    pushUrl(linkInBio, allSeen, u);
  }
  for (const u of [...direct, ...linkInBio]) {
    pushUrl(all, allSeen, u);
  }

  const directFiltered = direct.filter((u) => !isLinkInBioUrl(u));
  const linkFiltered = uniqueHttpUrls([
    ...linkInBio,
    ...direct.filter((u) => isLinkInBioUrl(u)),
  ]);

  return {
    all: uniqueHttpUrls(all),
    direct: uniqueHttpUrls(directFiltered),
    linkInBio: linkFiltered,
  };
}

export function prospectRecordToStackInput(prospect: ProspectRecord): StackProspectInput {
  const urls = collectStackUrls({
    website: prospect.bestMatch?.url,
    bioUrl: prospect.linkInBioUrl,
    bestMatchUrl: prospect.bestMatch?.url ?? prospect.bookingUrl,
    bookingUrl: prospect.bookingUrl,
    linkInBioUrl: prospect.linkInBioUrl,
    linkTrailUrls: prospect.linkTrailUrlsScanned,
    linkTrailUrlsScanned: prospect.linkTrailUrlsScanned,
    allMatchedUrls: prospect.allMatchedUrls,
    providerDiscoveryDebug: prospect.providerDiscoveryDebug,
    instagramHandle: prospect.identity.handle,
  });

  return {
    prospectId: prospect.prospectId,
    instagramHandle: prospect.identity.handle,
    displayName: prospect.identity.name,
    website: prospect.bestMatch?.url ?? undefined,
    bioUrl: prospect.linkInBioUrl ?? undefined,
    bestMatchUrl: prospect.bestMatch?.url ?? prospect.bookingUrl ?? undefined,
    bookingUrl: prospect.bookingUrl ?? undefined,
    linkInBioUrl: prospect.linkInBioUrl ?? undefined,
    linkTrailUrls: urls.linkInBio,
    linkTrailUrlsScanned: prospect.linkTrailUrlsScanned,
    allMatchedUrls: urls.all.map((url) => ({ url })),
    bookingProvider: prospect.bookingProvider,
    bookingProviderConfidence: prospect.bookingProviderConfidence,
    bookingProviderSource: prospect.bookingProviderSource,
    collectedUrls: urls.all,
    collectedDirectUrls: urls.direct,
    collectedLinkUrls: urls.linkInBio,
  };
}
