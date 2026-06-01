// lib/intelligence/salon/gg-booking-display.ts
// UI helpers — only show GlossGenius when validation confirmed.

import { isGgValidationConfirmed } from "./glossgenius-page-validator";
import type { ProspectRecord } from "@/lib/studios/prospects/types";

export type SalonBookingDisplayFields = Pick<
  ProspectRecord,
  | "bookingProvider"
  | "bookingProviderLabel"
  | "bookingUrl"
  | "bookingProviderSource"
  | "bookingProviderConfidence"
  | "ggValidationStatus"
>;

/** Whether the prospect table/drawer should show a booking provider pill. */
export function isConfirmedSalonBookingProvider(
  p: SalonBookingDisplayFields,
): boolean {
  const provider = p.bookingProvider;
  if (!provider || provider === "unknown") return false;
  if (provider !== "glossgenius") return true;
  return isGgValidationConfirmed(p.ggValidationStatus);
}

export function bookingProviderForDisplay(
  p: SalonBookingDisplayFields,
): Pick<
  SalonBookingDisplayFields,
  "bookingProvider" | "bookingProviderLabel" | "bookingUrl" | "bookingProviderSource"
> {
  if (!isConfirmedSalonBookingProvider(p)) {
    return {
      bookingProvider: undefined,
      bookingProviderLabel: undefined,
      bookingUrl: undefined,
      bookingProviderSource: undefined,
    };
  }
  return {
    bookingProvider: p.bookingProvider,
    bookingProviderLabel: p.bookingProviderLabel,
    bookingUrl: p.bookingUrl,
    bookingProviderSource: p.bookingProviderSource,
  };
}
