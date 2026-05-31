// lib/intelligence/transpo/verification/providers/bbb-provider.ts
// Better Business Bureau verification. Placeholder/manual until a data source is
// connected. Never throws.

import type { TranspoCarrierTarget } from "../../types";
import type { TranspoCarrierVerification } from "../../verification-types";

export async function verifyWithBbb(
  carrier: TranspoCarrierTarget,
): Promise<Partial<TranspoCarrierVerification>> {
  void carrier;
  return {
    bbbFound: false,
    notes: ["BBB provider not connected."],
    providersChecked: ["bbb"],
  };
}
