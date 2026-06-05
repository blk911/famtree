// lib/intelligence/transpo/provider-dossiers/dossier-engine.ts

import { resolveCountyFromCityState } from "../demand/census-adapter";
import type { TranspoEvidence } from "../types";
import type { TranspoCarrierTarget } from "../types";
import type { TranspoCarrierVerification } from "../verification-types";
import { classifyProviderWithSignals } from "../provider-classification-engine";
import { getColoradoMarketPayerMeta } from "../payers/payer-engine";
import type { TranspoDossierEvidence, TranspoProviderDossier } from "./dossier-types";

export function contactabilityBand(
  score: number,
): TranspoProviderDossier["contactabilityBand"] {
  if (score >= 75) return "strong";
  if (score >= 50) return "good";
  if (score >= 25) return "fair";
  return "weak";
}

export function computeContactabilityScore(input: {
  website?: string;
  phone?: string;
  googlePlaceId?: string;
  googleFound?: boolean;
  verifiedAddress?: boolean;
  email?: string;
  authorityActive?: boolean;
}): number {
  let score = 0;
  if (input.website?.trim()) score += 20;
  if (input.phone?.trim()) score += 20;
  if (input.googlePlaceId || input.googleFound) score += 20;
  if (input.verifiedAddress) score += 15;
  if (input.email?.trim()) score += 15;
  if (input.authorityActive) score += 10;
  return Math.max(0, Math.min(100, score));
}

function yearsSince(iso?: string): number | undefined {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return undefined;
  return Math.max(0, Math.round((Date.now() - t) / (365.25 * 24 * 3600 * 1000)));
}

function authorityIsActive(status?: string): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s.includes("active") || s === "a" || s.includes("authorized");
}

export function buildProviderDossier(
  carrier: TranspoCarrierTarget,
  verification: TranspoCarrierVerification | undefined,
  evidenceItems: TranspoEvidence[],
): TranspoProviderDossier {
  const now = new Date().toISOString();
  const state = (carrier.state ?? verification?.state ?? "").trim().toUpperCase();
  const city = (carrier.city ?? verification?.city ?? "").trim();
  const county =
    state && city
      ? resolveCountyFromCityState(state, city)?.county
      : undefined;

  const { category, signals } = classifyProviderWithSignals(carrier, verification);
  const categories = new Set<string>([category]);
  if (signals.length) signals.forEach((s) => categories.add(s));

  const countiesServed = new Set<string>();
  if (county) countiesServed.add(county);

  const phone =
    carrier.phone ??
    verification?.googlePhone ??
    verification?.websiteExtractedPhones?.[0];
  const website =
    carrier.website ??
    verification?.websiteUrl ??
    verification?.websiteFinalUrl ??
    verification?.googleWebsite;
  const email = verification?.websiteExtractedEmails?.[0];
  const address = verification?.googleAddress;
  const verifiedAddress = !!(verification?.googleFound && address);

  const contactabilityScore = computeContactabilityScore({
    website,
    phone,
    googlePlaceId: verification?.googlePlaceId,
    googleFound: verification?.googleFound,
    verifiedAddress,
    email,
    authorityActive: authorityIsActive(carrier.authorityStatus),
  });

  const evidence: TranspoDossierEvidence[] = [];

  if (carrier.dotNumber) {
    evidence.push({ type: "authority", source: "fmcsa", value: `DOT ${carrier.dotNumber}` });
  }
  if (carrier.mcNumber) {
    evidence.push({ type: "authority", source: "fmcsa", value: `MC ${carrier.mcNumber}` });
  }
  for (const src of carrier.sources) {
    evidence.push({ type: "provenance", source: src, value: `Carrier source: ${src}` });
  }
  if (verification?.googleFound) {
    evidence.push({
      type: "google_business",
      source: "google",
      value: verification.googleBusinessName ?? carrier.companyName,
      sourceUrl: verification.googleMapsUrl,
    });
  }
  if (verification?.websiteFetchStatus === "fetched" || verification?.websiteFetchStatus === "partial") {
    evidence.push({
      type: "website_crawl",
      source: "website",
      value: verification.websiteTitle ?? verification.websiteFinalUrl ?? website ?? "Website crawled",
      sourceUrl: verification.websiteFinalUrl ?? website,
    });
  }
  if (verification?.stateRegistryProvider === "colorado_sos" && verification.stateEntityFound) {
    evidence.push({
      type: "state_registry",
      source: "colorado_sos",
      value: verification.stateEntityName ?? carrier.companyName,
      sourceUrl: verification.stateEntityUrl,
    });
  }
  for (const ev of evidenceItems) {
    evidence.push({
      type: ev.evidenceType,
      source: ev.source,
      value: ev.value,
      sourceUrl: ev.sourceUrl,
    });
  }

  const payerSignals: string[] = [];
  if (county && state === "CO") {
    for (const cat of Array.from(categories)) {
      const meta = getColoradoMarketPayerMeta(county, cat);
      if (meta.brokerName) payerSignals.push(`${cat}: ${meta.brokerName}`);
    }
  }

  const sourceCount = new Set([
    ...carrier.sources,
    ...(verification?.providersChecked ?? []).map(String),
    ...evidence.map((e) => e.source),
  ]).size;

  return {
    providerId: carrier.id,
    companyName: carrier.companyName,
    dotNumber: carrier.dotNumber,
    mcNumber: carrier.mcNumber,
    address,
    city: city || undefined,
    county,
    state: state || undefined,
    phone,
    email,
    website,
    googlePlaceId: verification?.googlePlaceId,
    googleRating: verification?.googleRating,
    googleReviewCount: verification?.googleReviewCount,
    authorityStatus: carrier.authorityStatus,
    fleetSize: carrier.fleetSize,
    driverCount: carrier.driverCount,
    serviceCategories: Array.from(categories),
    countiesServed: Array.from(countiesServed),
    payerSignals,
    verificationStatus: verification?.verificationStatus ?? "missing",
    verificationScore: verification?.verificationScore,
    yearsObserved: yearsSince(carrier.createdAt),
    sourceCount,
    contactabilityScore,
    contactabilityBand: contactabilityBand(contactabilityScore),
    evidence,
    createdAt: carrier.createdAt ?? now,
    updatedAt: now,
  };
}

export function buildAllProviderDossiers(input: {
  carriers: TranspoCarrierTarget[];
  verifications: TranspoCarrierVerification[];
  evidence: TranspoEvidence[];
}): TranspoProviderDossier[] {
  const verByCarrier = new Map(input.verifications.map((v) => [v.carrierId, v]));
  const evidenceByCarrier = new Map<string, TranspoEvidence[]>();
  for (const carrier of input.carriers) {
    const ids = new Set(carrier.evidenceIds ?? []);
    const matched = input.evidence.filter(
      (e) => ids.has(e.id) || e.carrierKey.includes(carrier.id),
    );
    evidenceByCarrier.set(carrier.id, matched);
  }

  return input.carriers.map((c) =>
    buildProviderDossier(c, verByCarrier.get(c.id), evidenceByCarrier.get(c.id) ?? []),
  );
}

export function dossiersForCounty(
  dossiers: TranspoProviderDossier[],
  county: string,
  state = "CO",
): TranspoProviderDossier[] {
  const co = county.trim().toLowerCase();
  const st = state.trim().toUpperCase();
  return dossiers.filter(
    (d) =>
      d.state === st &&
      (d.county?.toLowerCase() === co || d.countiesServed.some((c) => c.toLowerCase() === co)),
  );
}
