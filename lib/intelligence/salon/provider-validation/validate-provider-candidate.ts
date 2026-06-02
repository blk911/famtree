// lib/intelligence/salon/provider-validation/validate-provider-candidate.ts

import type { SalonProviderCandidate, SalonProviderValidation } from "./types";
import { validateGlossGeniusCandidate } from "./validators/glossgenius-validator";
import { validateVagaroCandidate } from "./validators/vagaro-validator";
import { validateSquareCandidate } from "./validators/square-validator";
import { validateBooksyCandidate } from "./validators/booksy-validator";
import { validateFreshaCandidate } from "./validators/fresha-validator";
import { validateGenericProviderCandidate } from "./validators/generic-provider-validator";
import { getBookingProviderLabel } from "../provider-detector";

export async function validateProviderCandidate(
  candidate: SalonProviderCandidate,
  hints?: { handle?: string; displayName?: string },
): Promise<SalonProviderValidation> {
  const provider = candidate.provider.toLowerCase();
  const h = hints ?? {};

  try {
    switch (provider) {
      case "glossgenius":
        return await validateGlossGeniusCandidate(candidate, {
          handle: h.handle,
          displayName: h.displayName,
        });
      case "vagaro":
        return await validateVagaroCandidate(candidate);
      case "square":
        return await validateSquareCandidate(candidate);
      case "booksy":
        return await validateBooksyCandidate(candidate, { displayName: h.displayName });
      case "fresha":
        return await validateFreshaCandidate(candidate, { displayName: h.displayName });
      case "styleseat":
        return validateGenericProviderCandidate(candidate, {
          provider: "styleseat",
          providerLabel: "StyleSeat",
          hostPattern: /styleseat\.com/i,
          businessPathMinLength: 3,
          hints: h,
        });
      case "schedulicity":
        return validateGenericProviderCandidate(candidate, {
          provider: "schedulicity",
          providerLabel: "Schedulicity",
          hostPattern: /schedulicity\.com/i,
          hints: h,
        });
      case "acuity":
        return validateGenericProviderCandidate(candidate, {
          provider: "acuity",
          providerLabel: "Acuity Scheduling",
          hostPattern: /acuityscheduling\.com|acuityappointments\.com/i,
          hints: h,
        });
      default:
        return validateGenericProviderCandidate(candidate, {
          provider: candidate.provider,
          providerLabel: candidate.providerLabel || getBookingProviderLabel(provider as never) || provider,
          hostPattern: new RegExp(candidate.provider.replace(/_/g, "."), "i"),
          hints: h,
        });
    }
  } catch (e) {
    return {
      candidateId: candidate.id,
      prospectId: candidate.prospectId,
      provider: candidate.provider,
      providerLabel: candidate.providerLabel,
      candidateUrl: candidate.candidateUrl,
      status: "error",
      confirmed: false,
      confidence: 0,
      positiveMarkers: [],
      negativeMarkers: [],
      reason: e instanceof Error ? e.message : "Validation error",
      validatedAt: new Date().toISOString(),
      source: candidate.source,
      generated: candidate.generated,
    };
  }
}
