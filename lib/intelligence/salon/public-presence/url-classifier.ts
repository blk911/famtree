// lib/intelligence/salon/public-presence/url-classifier.ts

import {
  detectSalonBookingProvider,
  getBookingProviderLabel,
} from "../provider-detector";
import { isLinkInBioUrl } from "../provider-detector";
import type { SalonPublicPresenceUrlType } from "./types";

export type ClassifiedSalonUrl = {
  urlType: SalonPublicPresenceUrlType;
  provider?: string;
  providerLabel?: string;
  bookingUrl?: string;
};

const LINK_IN_BIO_HOSTS = [
  "linktr.ee",
  "beacons.ai",
  "stan.store",
  "msha.ke",
  "bio.site",
  "milkshake.app",
  "solo.to",
  "campsite.bio",
];

const SALON_SUITE_HOSTS = [
  "solasalonstudios.com",
  "phenixsalonsuites.com",
  "salonlofts.com",
  "mysalonsuite.com",
];

const REVIEW_HOSTS = ["yelp.com", "bbb.org", "google.com/maps", "g.page", "maps.google.com"];

const DIRECTORY_HINTS = ["fresha.com/l/", "vagaro.com/listings", "styleseat.com/v"];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function classifySalonUrl(
  url: string,
  title?: string,
  snippet?: string,
): ClassifiedSalonUrl {
  const hay = `${url} ${title ?? ""} ${snippet ?? ""}`.toLowerCase();
  const host = hostOf(url);

  const detection = detectSalonBookingProvider(url);
  if (detection && detection.provider !== "unknown") {
    return {
      urlType: "booking_provider",
      provider: detection.provider,
      providerLabel: detection.providerLabel,
      bookingUrl: detection.bookingUrl ?? url,
    };
  }

  if (isLinkInBioUrl(url) || LINK_IN_BIO_HOSTS.some((h) => host.includes(h))) {
    return { urlType: "link_in_bio" };
  }

  if (host.includes("instagram.com") || host.includes("facebook.com")) {
    return { urlType: host.includes("instagram.com") ? "instagram" : "facebook" };
  }

  if (
    host.includes("google.com") &&
    (hay.includes("/maps") || hay.includes("place") || host.includes("g.page"))
  ) {
    return { urlType: "google_business_profile" };
  }

  if (REVIEW_HOSTS.some((h) => host.includes(h.replace("www.", "")))) {
    return { urlType: "review_site" };
  }

  if (SALON_SUITE_HOSTS.some((h) => host.includes(h))) {
    return { urlType: "salon_suite" };
  }

  if (DIRECTORY_HINTS.some((h) => hay.includes(h))) {
    return { urlType: "directory" };
  }

  if (host && !host.includes("instagram.com")) {
    return { urlType: "business_website" };
  }

  return { urlType: "unknown" };
}

export function providerLabelFor(provider?: string): string | undefined {
  if (!provider || provider === "unknown") return undefined;
  return getBookingProviderLabel(provider as "unknown");
}
