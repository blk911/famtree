// lib/intelligence/salon/provider-validation/validators/booksy-validator.ts

import { validateGenericProviderCandidate } from "./generic-provider-validator";
import type { SalonProviderCandidate, SalonProviderValidation } from "../types";

export async function validateBooksyCandidate(
  candidate: SalonProviderCandidate,
  hints: { displayName?: string },
): Promise<SalonProviderValidation> {
  return validateGenericProviderCandidate(candidate, {
    provider: "booksy",
    providerLabel: "Booksy",
    hostPattern: /booksy\.com/i,
    businessPathMinLength: 3,
    marketingPaths: ["/pricing", "/login", "/signup", "/business"],
    positiveIds: ["book", "services", "appointment"],
    hints,
  });
}
