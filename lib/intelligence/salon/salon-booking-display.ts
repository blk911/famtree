// lib/intelligence/salon/salon-booking-display.ts

import { bookingProviderForDisplay, type SalonBookingDisplayFields } from "./gg-booking-display";
import { isGgValidationConfirmed } from "./glossgenius-page-validator";
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
    (s) => s.category === "booking" && s.providerId === bookingId,
  );
  if (!sig && bookingId !== "glossgenius") return base;

  const provider = sig?.providerId ?? bookingId;
  if (provider === "glossgenius") {
    const confirmed =
      isGgValidationConfirmed(p.ggValidationStatus) ||
      (sig?.confidence ?? 0) >= 0.85;
    if (!confirmed) return base;
  }

  return {
    bookingProvider: provider,
    bookingProviderLabel:
      sig?.providerLabel ??
      (provider === "glossgenius" ||
      provider === "vagaro" ||
      provider === "square" ||
      provider === "booksy" ||
      provider === "fresha" ||
      provider === "styleseat"
        ? getBookingProviderLabel(provider)
        : sig?.providerLabel ?? provider),
    bookingUrl: sig?.url,
    bookingProviderSource:
      sig?.source === "link_in_bio"
        ? "link_in_bio"
        : sig?.source === "website_link" || sig?.source === "website_html"
          ? "website_crawl"
          : p.bookingProviderSource ?? "direct_url",
  };
}

export function isImportCandidateWithStack(
  p: ProspectRecord,
  stack?: SalonBusinessStack | null,
): boolean {
  const display = bookingProviderForDisplayWithStack(p, stack);
  if (display.bookingProvider === "glossgenius" || display.bookingProvider === "vagaro") {
    return true;
  }
  return false;
}
