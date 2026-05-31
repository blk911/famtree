// lib/intelligence/transpo/verification/providers/state-registry-provider.ts
// State business-registry verification. Placeholder/manual: per-state Secretary
// of State lookups are not wired, so this returns a partial placeholder that
// records which state would be checked. Never throws.

import type { TranspoCarrierTarget } from "../../types";
import type { TranspoCarrierVerification } from "../../verification-types";

export async function verifyWithStateRegistry(
  carrier: TranspoCarrierTarget,
): Promise<Partial<TranspoCarrierVerification>> {
  const state = (carrier.state ?? "").trim();
  if (!state) {
    return {
      notes: ["State registry lookup skipped — no state on carrier."],
      providersChecked: ["state_registry"],
    };
  }
  return {
    // Unknown (not false): we genuinely have not checked.
    stateEntityFound: undefined,
    notes: [`State registry lookup not connected for ${state}.`],
    providersChecked: ["state_registry"],
  };
}
