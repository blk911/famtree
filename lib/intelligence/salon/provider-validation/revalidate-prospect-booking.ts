// lib/intelligence/salon/provider-validation/revalidate-prospect-booking.ts

import type { ProspectRecord } from "@/lib/studios/prospects/types";
import { isConfirmedSalonBookingProvider } from "../gg-booking-display";
import { randomUUID } from "crypto";
import { validateProviderCandidate } from "./validate-provider-candidate";
import type { SalonProviderCandidate, SalonProviderValidation } from "./types";
import type { ProviderBackfillStats } from "./types";

const GENERATED_SOURCES = new Set([
  "handle_derived",
  "display_name_derived",
  "handle_guess",
  "display_guess",
]);

export async function revalidateProspectBookingFields(
  prospect: ProspectRecord,
): Promise<{
  fields: Partial<ProspectRecord>;
  validation?: SalonProviderValidation;
  downgraded: boolean;
}> {
  const url = prospect.bookingUrl;
  const provider = prospect.bookingProvider;
  if (!url?.startsWith("http") || !provider || provider === "unknown") {
    return { fields: {}, downgraded: false };
  }

  const source = prospect.bookingProviderSource ?? "";
  if (isConfirmedSalonBookingProvider(prospect)) {
    return { fields: {}, downgraded: false };
  }

  const needsCheck =
    GENERATED_SOURCES.has(source) ||
    provider === "glossgenius" ||
    !prospect.providerDiscoveryDebug?.providerValidation?.confirmed?.confirmed;

  if (!needsCheck) {
    return { fields: {}, downgraded: false };
  }

  const candidate: SalonProviderCandidate = {
    id: randomUUID(),
    prospectId: prospect.prospectId,
    provider,
    providerLabel: prospect.bookingProviderLabel ?? provider,
    candidateUrl: url,
    source: source === "handle_derived" ? "handle_guess" : source === "display_name_derived" ? "display_guess" : "direct_url",
    confidenceHint: prospect.bookingProviderConfidence ?? 70,
    generated: GENERATED_SOURCES.has(source),
    createdAt: new Date().toISOString(),
  };

  const validation = await validateProviderCandidate(candidate, {
    handle: prospect.identity.handle.replace(/^@+/, ""),
    displayName: prospect.identity.name ?? undefined,
  });

  if (validation.confirmed) {
    const dbg = {
      ...(prospect.providerDiscoveryDebug ?? {}),
      providerValidation: {
        candidates: [candidate],
        validations: [validation],
        confirmed: validation,
      },
    };
    return {
      fields: {
        bookingUrl: validation.finalUrl ?? url,
        bookingProviderConfidence: Math.round(validation.confidence * 100),
        providerDiscoveryDebug: dbg,
        ggValidationStatus:
          provider === "glossgenius" && validation.status === "confirmed"
            ? "confirmed_client_page"
            : prospect.ggValidationStatus,
        ggValidatedUrl: provider === "glossgenius" ? validation.finalUrl ?? url : prospect.ggValidatedUrl,
      },
      validation,
      downgraded: false,
    };
  }

  const dbg = {
    ...(prospect.providerDiscoveryDebug ?? {}),
    providerValidation: {
      candidates: [candidate],
      validations: [validation],
    },
  };

  return {
    fields: {
      bookingProvider: undefined,
      bookingProviderLabel: undefined,
      bookingUrl: undefined,
      bookingProviderConfidence: undefined,
      bookingProviderEvidence: undefined,
      bookingProviderSource: undefined,
      ggValidationStatus: provider === "glossgenius" ? "generic_glossgenius_page" : undefined,
      ggValidatedUrl: undefined,
      providerDiscoveryDebug: dbg,
      providerResolverReason: `downgraded:${validation.status}`,
    },
    validation,
    downgraded: true,
  };
}

export function initProviderBackfillStats(): ProviderBackfillStats {
  return {
    checked: 0,
    candidatesFound: 0,
    validationsRun: 0,
    confirmedProviders: 0,
    rejectedGenericHomepage: 0,
    rejectedNotFound: 0,
    downgradedFalsePositives: 0,
    providersByType: {},
  };
}

export function accumulateBackfillStats(
  stats: ProviderBackfillStats,
  validation: SalonProviderValidation | undefined,
  downgraded: boolean,
  provider?: string,
): void {
  stats.checked++;
  if (validation) {
    stats.validationsRun++;
    if (validation.confirmed) {
      stats.confirmedProviders++;
      if (provider) {
        stats.providersByType[provider] = (stats.providersByType[provider] ?? 0) + 1;
      }
    }
    if (
      validation.status === "rejected_generic_homepage" ||
      validation.status === "rejected_marketing_page" ||
      validation.status === "rejected_redirect_home"
    ) {
      stats.rejectedGenericHomepage++;
    }
    if (validation.status === "rejected_not_found") {
      stats.rejectedNotFound++;
    }
  }
  if (downgraded) stats.downgradedFalsePositives++;
}
