// lib/intelligence/transpo/verification/providers/address-classifier-provider.ts
// Address classifier. Conservative, offline heuristic classification of the
// carrier's address from available text clues. Defaults to "unknown" rather than
// guessing. Never throws.

import type { TranspoCarrierTarget } from "../../types";
import type {
  TranspoCarrierVerification,
  TranspoAddressType,
} from "../../verification-types";

const PO_BOX_RE = /\bp\.?\s*o\.?\s*box\b|\bpost\s+office\s+box\b/i;
// Unit/apartment markers that lean residential when no industrial signal exists.
const RESIDENTIAL_RE = /\b(apt|apartment|unit|#\s*\d+|suite\s+\d+|ste\s+\d+|lot\s+\d+|trlr|trailer|condo)\b/i;
const INDUSTRIAL_RE = /\b(warehouse|terminal|industrial|distribution|freight|depot|dock|yard|plant)\b/i;
const OFFICE_RE = /\b(suite|ste|floor|fl|bldg|building|plaza|tower|office)\b/i;

const COMPANY_INDUSTRIAL_RE = /\b(warehouse|logistics|terminal|supply|freight|trucking|transport|distribution|hauling|carriers?)\b/i;

export async function verifyWithAddressClassifier(
  carrier: TranspoCarrierTarget,
): Promise<Partial<TranspoCarrierVerification>> {
  // Carrier master may not persist a street address; read it defensively so the
  // classifier works if/when address is carried through, and degrades to
  // "unknown" otherwise.
  const address = ((carrier as { address?: string }).address ?? "").trim();
  const company = (carrier.companyName ?? "").trim();

  let addressType: TranspoAddressType = "unknown";
  const notes: string[] = [];

  if (!address) {
    notes.push("No street address available — address type unknown.");
    return { addressType: "unknown", notes, providersChecked: ["address_classifier"] };
  }

  if (PO_BOX_RE.test(address)) {
    addressType = "po_box";
    notes.push("Address looks like a PO Box.");
  } else if (INDUSTRIAL_RE.test(address)) {
    addressType = /\bwarehouse|distribution\b/i.test(address) ? "warehouse" : "industrial_yard";
    notes.push("Address has industrial/yard markers.");
  } else if (RESIDENTIAL_RE.test(address) && !OFFICE_RE.test(address)) {
    addressType = "residential";
    notes.push("Address has residential/unit markers.");
  } else if (OFFICE_RE.test(address)) {
    addressType = "office";
    notes.push("Address has office/suite markers.");
  } else if (COMPANY_INDUSTRIAL_RE.test(company)) {
    // Weak company-name inference; stay conservative (unknown, not warehouse).
    addressType = "unknown";
    notes.push("Company name suggests transport/industrial use; address inconclusive.");
  } else {
    notes.push("Address type inconclusive — defaulting to unknown.");
  }

  return { addressType, notes, providersChecked: ["address_classifier"] };
}
