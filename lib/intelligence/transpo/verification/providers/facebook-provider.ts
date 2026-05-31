// lib/intelligence/transpo/verification/providers/facebook-provider.ts
// Facebook presence verification. Placeholder/manual until a data source is
// connected. Never throws.

import type { TranspoCarrierTarget } from "../../types";
import type { TranspoCarrierVerification } from "../../verification-types";

export async function verifyWithFacebook(
  carrier: TranspoCarrierTarget,
): Promise<Partial<TranspoCarrierVerification>> {
  void carrier;
  return {
    facebookFound: false,
    notes: ["Facebook provider not connected."],
    providersChecked: ["facebook"],
  };
}
