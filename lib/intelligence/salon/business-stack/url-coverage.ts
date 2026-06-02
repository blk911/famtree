// lib/intelligence/salon/business-stack/url-coverage.ts
// Prospect URL field coverage for stack backfill diagnostics.

import type { ProspectRecord } from "@/lib/studios/prospects/types";
import { collectStackUrls, hydrateProspectUrlFields } from "./collect-urls";

export type StackUrlCoverageDiagnostics = {
  prospectsChecked: number;
  prospectsWithHandle: number;
  prospectsWithAnyUrl: number;
  prospectsWithExternalUrl: number;
  prospectsWithBioUrls: number;
  prospectsWithBestUrl: number;
  skippedNoUrls: number;
};

function hasHttpUrl(raw?: string | null): boolean {
  const u = (raw ?? "").trim();
  return u.startsWith("http://") || u.startsWith("https://");
}

/** Whether the prospect record has any IG-resolver / trail URL material before stack expand. */
export function prospectHasStoredUrlFields(prospect: ProspectRecord): boolean {
  const dbg = prospect.providerDiscoveryDebug;
  if (hasHttpUrl(prospect.bestMatch?.url)) return true;
  if (hasHttpUrl(prospect.bookingUrl)) return true;
  if (hasHttpUrl(prospect.linkInBioUrl)) return true;
  if ((prospect.linkTrailUrlsScanned ?? []).some(hasHttpUrl)) return true;
  if ((prospect.allMatchedUrls ?? []).some((m) => hasHttpUrl(m.url))) return true;
  if (hasHttpUrl(dbg?.externalUrl)) return true;
  if ((dbg?.bioUrls ?? []).some(hasHttpUrl)) return true;
  if ((dbg?.directUrlsScanned ?? []).some(hasHttpUrl)) return true;
  if ((dbg?.urlsScanned ?? []).some(hasHttpUrl)) return true;
  if ((dbg?.linkTrailUrlsScanned ?? []).some(hasHttpUrl)) return true;
  if ((prospect.candidateUrlsTested ?? []).some(hasHttpUrl)) return true;
  return false;
}

/** URLs the stack engine will scan (after collectStackUrls merge). */
export function countCollectableStackUrls(prospect: ProspectRecord): number {
  const hydrated = hydrateProspectUrlFields(prospect);
  const dbg = hydrated.providerDiscoveryDebug;
  const { all } = collectStackUrls({
    website:
      hydrated.bestMatch?.platform === "website" ? hydrated.bestMatch.url : undefined,
    externalUrl: dbg?.externalUrl ?? undefined,
    bioUrl: hydrated.linkInBioUrl,
    bestMatchUrl: hydrated.bestMatch?.url ?? hydrated.bookingUrl,
    bookingUrl: hydrated.bookingUrl,
    linkInBioUrl: hydrated.linkInBioUrl,
    linkTrailUrls: hydrated.linkTrailUrlsScanned,
    linkTrailUrlsScanned: hydrated.linkTrailUrlsScanned,
    allMatchedUrls: hydrated.allMatchedUrls,
    candidateUrlsTested: hydrated.candidateUrlsTested,
    providerDiscoveryDebug: dbg,
    instagramHandle: hydrated.identity.handle,
  });
  return all.length;
}

export function auditSalonProspectUrlCoverage(
  prospects: ProspectRecord[],
  skippedNoUrls = 0,
): StackUrlCoverageDiagnostics {
  let prospectsWithHandle = 0;
  let prospectsWithAnyUrl = 0;
  let prospectsWithExternalUrl = 0;
  let prospectsWithBioUrls = 0;
  let prospectsWithBestUrl = 0;

  for (const p of prospects) {
    const handle = p.identity.handle.replace(/^@+/, "").trim();
    if (handle.length > 1) prospectsWithHandle++;

    const dbg = p.providerDiscoveryDebug;
    if (hasHttpUrl(p.bestMatch?.url) || hasHttpUrl(p.bookingUrl)) {
      prospectsWithBestUrl++;
    }
    if (
      hasHttpUrl(dbg?.externalUrl) ||
      (dbg?.directUrlsScanned ?? []).some(hasHttpUrl)
    ) {
      prospectsWithExternalUrl++;
    }
    if ((dbg?.bioUrls ?? []).some(hasHttpUrl)) {
      prospectsWithBioUrls++;
    }
    if (prospectHasStoredUrlFields(p) || countCollectableStackUrls(p) > 0) {
      prospectsWithAnyUrl++;
    }
  }

  return {
    prospectsChecked: prospects.length,
    prospectsWithHandle,
    prospectsWithAnyUrl,
    prospectsWithExternalUrl,
    prospectsWithBioUrls,
    prospectsWithBestUrl,
    skippedNoUrls,
  };
}
