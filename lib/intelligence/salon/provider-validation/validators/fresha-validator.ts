// lib/intelligence/salon/provider-validation/validators/fresha-validator.ts

import { validateGenericProviderCandidate } from "./generic-provider-validator";
import type { SalonProviderCandidate, SalonProviderValidation } from "../types";

export async function validateFreshaCandidate(
  candidate: SalonProviderCandidate,
  hints: { displayName?: string },
): Promise<SalonProviderValidation> {
  return validateGenericProviderCandidate(candidate, {
    provider: "fresha",
    providerLabel: "Fresha",
    hostPattern: /fresha\.(com|net)/i,
    businessPathMinLength: 3,
    marketingPaths: ["/pricing", "/login", "/signup", "/partners"],
    positiveIds: ["book", "services", "appointment"],
    hints,
  });
}
