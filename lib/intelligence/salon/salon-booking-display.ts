// lib/intelligence/salon/salon-booking-display.ts

import {
  bookingProviderForDisplay,
  isConfirmedSalonBookingProvider,
  type SalonBookingDisplayFields,
} from "./gg-booking-display";
import { getBookingProviderLabel } from "./provider-detector";
import type { SalonBusinessStack } from "./business-stack/types";
import type { ProspectRecord } from "@/lib/studios/prospects/types";

export function bookingProviderForDisplayWithStack(
  p: SalonBookingDisplayFields,
  stack?: SalonBusinessStack | null,
): ReturnType<typeof bookingProviderForDisplay> {
  const base = bookingProviderForDisplay(p);
  if (base.bookingProvider) return base;

  if (!stack?.primaryBookingProvider && !stack?.signals?.length) {
    return base;
  }

  const bookingId = stack.primaryBookingProvider ?? "glossgenius";
  const sig = stack.signals.find(
    (s) =>
      s.category === "booking" &&
      s.providerId === bookingId &&
      s.evidence.some((e) => e.includes("provider_validation:confirmed")),
  );
  if (!sig) return base;

  const provider = sig.providerId === "square_appointments" ? "square" : sig.providerId;

  return {
    bookingProvider: provider,
    bookingProviderLabel:
      sig.providerLabel ??
      getBookingProviderLabel(provider as "glossgenius"),
    bookingUrl: sig.url,
    bookingProviderSource:
      sig.source === "link_in_bio"
        ? "link_in_bio"
        : sig.source === "website_link" || sig.source === "website_html"
          ? "website_crawl"
          : p.bookingProviderSource ?? "direct_url",
  };
}

export function isImportCandidateWithStack(
  p: ProspectRecord,
  stack?: SalonBusinessStack | null,
): boolean {
  const display = bookingProviderForDisplayWithStack(p, stack);
  if (!display.bookingProvider) return false;
  return (
    display.bookingProvider === "glossgenius" || display.bookingProvider === "vagaro"
  );
}

export { isConfirmedSalonBookingProvider };
