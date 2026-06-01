// lib/intelligence/salon/provider-source-labels.ts
// UI labels for booking provider detection source chips.

import type { ProspectRecord } from "@/lib/studios/prospects/types";

export type BookingProviderSourceKey =
  | "direct_url"
  | "link_in_bio"
  | "link_trail"
  | "handle_derived"
  | "display_name_derived"
  | "unknown";

export const BOOKING_PROVIDER_SOURCE_LABELS: Record<BookingProviderSourceKey, string> = {
  direct_url: "Direct",
  link_in_bio: "Link-in-Bio",
  link_trail: "Link-in-Bio",
  handle_derived: "Handle Match",
  display_name_derived: "Display Match",
  unknown: "Unknown",
};

export function normalizeBookingProviderSource(
  raw?: string | null,
): BookingProviderSourceKey | undefined {
  if (!raw) return undefined;
  if (raw === "link_trail") return "link_in_bio";
  if (raw in BOOKING_PROVIDER_SOURCE_LABELS) {
    return raw as BookingProviderSourceKey;
  }
  return undefined;
}

export function bookingProviderSourceLabel(
  prospect: Pick<ProspectRecord, "bookingProviderSource" | "bookingProviderEvidence">,
): string | null {
  const key =
    normalizeBookingProviderSource(prospect.bookingProviderSource) ??
    parseSourceFromEvidence(prospect.bookingProviderEvidence);
  if (!key || key === "unknown") return null;
  return BOOKING_PROVIDER_SOURCE_LABELS[key];
}

function parseSourceFromEvidence(evidence?: string[]): BookingProviderSourceKey | undefined {
  const line = (evidence ?? []).find((e) => e.startsWith("providerSource:"));
  if (!line) return undefined;
  const raw = line.split(":")[1]?.trim();
  return normalizeBookingProviderSource(raw);
}
