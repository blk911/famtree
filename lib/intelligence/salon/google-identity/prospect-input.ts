// Map salon prospects to Google identity match inputs (read-only).

import type { ProspectRecord } from "@/lib/studios/prospects/types";
import { hydrateProspectUrlFields } from "../business-stack/collect-urls";
import { prospectToPublicPresenceInput } from "../public-presence/identity-extractor";
import type { GoogleIdentityProspectInput } from "./types";

function pickBusinessWebsite(prospect: ProspectRecord): string | undefined {
  const hydrated = hydrateProspectUrlFields(prospect);
  const bookingHosts = [
    "glossgenius.com",
    "styleseat.com",
    "vagaro.com",
    "booksy.com",
    "square.site",
    "fresha.com",
    "mylocalsalon",
  ];
  const urls = [
    hydrated.bestMatch?.url,
    ...(hydrated.allMatchedUrls ?? []).map((m) => m.url),
    hydrated.bookingUrl,
    hydrated.linkInBioUrl,
    ...(hydrated.linkTrailUrlsScanned ?? []),
  ].filter(Boolean) as string[];

  for (const raw of urls) {
    try {
      const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
      if (host.includes("instagram.com") || host.includes("facebook.com")) continue;
      if (bookingHosts.some((b) => host.includes(b))) continue;
      return raw;
    } catch {
      // skip invalid
    }
  }
  return undefined;
}

export function prospectToGoogleIdentityInput(
  prospect: ProspectRecord,
): GoogleIdentityProspectInput {
  const presence = prospectToPublicPresenceInput(prospect);
  const website = pickBusinessWebsite(prospect) ?? presence.website;
  return {
    prospectId: prospect.prospectId,
    displayName: presence.displayName ?? prospect.identity.name,
    city: presence.city ?? undefined,
    state: presence.state ?? undefined,
    phone: undefined,
    website: website ?? undefined,
    instagramHandle: presence.instagramHandle ?? prospect.identity.handle,
    bookingProvider: prospect.bookingProvider,
    bookingProviderLabel: prospect.bookingProviderLabel,
  };
}
