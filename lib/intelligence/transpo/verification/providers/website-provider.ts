// lib/intelligence/transpo/verification/providers/website-provider.ts
// Website verification. Real (offline) signal: uses the carrier's existing
// website field — no fetch required. Found when a non-empty website is present.

import type { TranspoCarrierTarget } from "../../types";
import type { TranspoCarrierVerification } from "../../verification-types";

export async function verifyWithWebsite(
  carrier: TranspoCarrierTarget,
): Promise<Partial<TranspoCarrierVerification>> {
  const website = (carrier.website ?? "").trim();
  if (website) {
    return {
      websiteFound: true,
      websiteUrl: website,
      notes: [`Website on record: ${website}`],
      providersChecked: ["website"],
    };
  }
  return {
    websiteFound: false,
    notes: ["No website on record."],
    providersChecked: ["website"],
  };
}
