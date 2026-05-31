// lib/intelligence/transpo/verification/providers/google-business-provider.ts
// Google Business verification. Provider-mode: only attempts a real lookup when
// GOOGLE_MAPS_API_KEY is present. The branch is structured but not overbuilt —
// it fails gracefully and never throws.

import type { TranspoCarrierTarget } from "../../types";
import type { TranspoCarrierVerification } from "../../verification-types";

export async function verifyWithGoogleBusiness(
  carrier: TranspoCarrierTarget,
): Promise<Partial<TranspoCarrierVerification>> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

  if (!apiKey) {
    return {
      googleFound: false,
      notes: ["Google Business provider not connected."],
      providersChecked: ["google_business"],
    };
  }

  // Credentials exist — structure the live branch without overbuilding. Any
  // failure degrades to "not found" with a diagnostic note.
  try {
    // Intentionally not calling the live Places API yet; once enabled, build the
    // Text Search + Place Details request here using `carrier` + `apiKey`.
    void carrier;
    return {
      googleFound: false,
      notes: ["Google Business provider connected but live lookup not yet enabled."],
      providersChecked: ["google_business"],
    };
  } catch (e) {
    return {
      googleFound: false,
      notes: [`Google Business lookup error: ${e instanceof Error ? e.message : String(e)}`],
      providersChecked: ["google_business"],
    };
  }
}
