// lib/intelligence/transpo/verification/providers/state-registry-provider.ts
// State business-registry verification router. Colorado is wired to the live
// Colorado SOS Socrata dataset; other states remain placeholder until their
// Secretary-of-State lookups are connected. Never throws.

import type { TranspoCarrierTarget } from "../../types";
import type { TranspoCarrierVerification } from "../../verification-types";
import { verifyColoradoStateRegistry } from "./colorado-state-registry-provider";

export async function verifyWithStateRegistry(
  carrier: TranspoCarrierTarget,
): Promise<Partial<TranspoCarrierVerification>> {
  const state = (carrier.state ?? "").trim();
  if (!state) {
    return {
      stateRegistryProvider: "placeholder",
      notes: ["State registry lookup skipped — no state on carrier."],
      providersChecked: ["state_registry"],
    };
  }

  if (state.toUpperCase() === "CO") {
    return verifyColoradoStateRegistry(carrier);
  }

  return {
    // Unknown (not false): we genuinely have not checked.
    stateRegistryProvider: "placeholder",
    stateEntityFound: undefined,
    notes: [`State registry lookup not connected for ${state}.`],
    providersChecked: ["state_registry"],
  };
}
