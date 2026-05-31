// lib/intelligence/transpo/verification-engine.ts
// Orchestrates the verification providers for a carrier, merges their partial
// results, and computes a verification score + status. Providers never throw;
// verifyCarrier still guards with try/catch so a single bad carrier degrades to
// an "error" verification rather than failing a batch.

import type { TranspoCarrierTarget } from "./types";
import type {
  TranspoCarrierVerification,
  TranspoVerificationProvider,
  TranspoVerificationStatus,
} from "./verification-types";
import { carrierIdentityKey } from "./carrier-master-store";
import { verifyWithGoogleBusiness } from "./verification/providers/google-business-provider";
import { verifyWithStateRegistry } from "./verification/providers/state-registry-provider";
import { verifyWithBbb } from "./verification/providers/bbb-provider";
import { verifyWithFacebook } from "./verification/providers/facebook-provider";
import { verifyWithWebsite } from "./verification/providers/website-provider";
import { verifyWithAddressClassifier } from "./verification/providers/address-classifier-provider";

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function isActiveEntity(status?: string): boolean {
  const s = (status ?? "").trim().toLowerCase();
  return s.includes("active") || s.includes("good standing");
}

/** Score a verification 0–100 from its collected signals. */
export function calculateVerificationScore(v: TranspoCarrierVerification): number {
  let s = 0;
  if (v.googleFound) s += 25;
  if ((v.googleRating ?? 0) >= 4) s += 10;
  if ((v.googleReviewCount ?? 0) >= 10) s += 10;
  if (v.websiteFound) s += 15;
  if (v.stateEntityFound) s += 15;
  if (isActiveEntity(v.entityStatus)) s += 10;
  if (v.facebookFound) s += 10;
  if (v.bbbFound) s += 10;
  if (v.addressType === "po_box") s -= 20;
  if (v.addressType === "residential") s -= 10;
  return clamp(s, 0, 100);
}

function determineStatus(v: TranspoCarrierVerification): TranspoVerificationStatus {
  const realSignalFound = Boolean(
    v.googleFound || v.websiteFound || v.stateEntityFound || v.facebookFound || v.bbbFound,
  );
  if (v.verificationScore >= 60) return "verified";
  if (v.verificationScore >= 20) return "partial";
  if (realSignalFound) return "not_found";
  // Score < 20 with no positive external signal: we mostly could not check
  // (placeholder providers), so this is "placeholder" rather than a confident
  // "not found".
  return "placeholder";
}

/** Run all providers for one carrier and produce a complete verification. */
export async function verifyCarrier(
  carrier: TranspoCarrierTarget,
): Promise<TranspoCarrierVerification> {
  const now = new Date().toISOString();
  const carrierKey = carrierIdentityKey(carrier) ?? carrier.id;
  const base: TranspoCarrierVerification = {
    id: `verif-${carrier.id}`,
    carrierId: carrier.id,
    carrierKey,
    dotNumber: carrier.dotNumber,
    companyName: carrier.companyName,
    city: carrier.city,
    state: carrier.state,
    verificationScore: 0,
    verificationStatus: "placeholder",
    notes: [],
    providersChecked: [],
    createdAt: now,
    updatedAt: now,
  };

  try {
    const partials = await Promise.all([
      verifyWithGoogleBusiness(carrier),
      verifyWithStateRegistry(carrier),
      verifyWithBbb(carrier),
      verifyWithFacebook(carrier),
      verifyWithWebsite(carrier),
      verifyWithAddressClassifier(carrier),
    ]);

    let merged: TranspoCarrierVerification = { ...base };
    const notes: string[] = [];
    const providers = new Set<TranspoVerificationProvider>();

    for (const partial of partials) {
      const { notes: pNotes, providersChecked: pProviders, ...fields } = partial;
      merged = { ...merged, ...fields };
      if (Array.isArray(pNotes)) notes.push(...pNotes);
      if (Array.isArray(pProviders)) pProviders.forEach((p) => providers.add(p));
    }

    merged.notes = notes;
    merged.providersChecked = Array.from(providers);
    merged.verificationScore = calculateVerificationScore(merged);
    merged.verificationStatus = determineStatus(merged);
    merged.updatedAt = now;
    // Preserve identity fields (provider spreads must not clobber these).
    merged.id = base.id;
    merged.carrierId = base.carrierId;
    merged.carrierKey = base.carrierKey;
    merged.companyName = base.companyName;
    return merged;
  } catch (e) {
    return {
      ...base,
      verificationStatus: "error",
      notes: [`Verification error: ${e instanceof Error ? e.message : String(e)}`],
      updatedAt: now,
    };
  }
}

export type VerifyCarriersOptions = {
  /** Cap how many carriers to verify in this batch. */
  limit?: number;
};

/** Verify a batch of carriers sequentially (placeholder providers are cheap). */
export async function verifyCarriers(
  carriers: TranspoCarrierTarget[],
  options: VerifyCarriersOptions = {},
): Promise<TranspoCarrierVerification[]> {
  const slice =
    typeof options.limit === "number" && options.limit > 0
      ? carriers.slice(0, options.limit)
      : carriers;

  const out: TranspoCarrierVerification[] = [];
  for (const carrier of slice) {
    out.push(await verifyCarrier(carrier));
  }
  return out;
}
