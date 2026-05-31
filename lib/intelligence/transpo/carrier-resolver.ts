// lib/intelligence/transpo/carrier-resolver.ts
// Carrier Resolver — collapse Evidence Lake items into resolved carrier targets.
// Evidence is grouped by carrierKey; for each carrier the strongest identity and
// the latest contact/location/fleet/authority signals are chosen. Confidence is
// intentionally NOT re-scored here — evidence confidence and evidence count are
// preserved so a later scoring pass can build on them.

import { parseFacets } from "./evidence-store";
import type {
  TranspoEvidence,
  TranspoCarrierTarget,
  TranspoSource,
} from "./types";

function normalizeToken(value: string | undefined | null): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function keyToId(carrierKey: string): string {
  return `transpo-carrier-${carrierKey
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)}`;
}

/** Recover raw DOT/MC from an evidence carrierKey (name keys carry neither). */
function parseCarrierKey(carrierKey: string): { dotNumber?: string; mcNumber?: string } {
  if (carrierKey.startsWith("dot:")) return { dotNumber: carrierKey.slice(4) };
  if (carrierKey.startsWith("mc:")) return { mcNumber: carrierKey.slice(3) };
  return {};
}

/** Identity key for an existing carrier target, matching evidenceCarrierKey(). */
function targetCarrierKey(t: TranspoCarrierTarget): string | null {
  const dot = (t.dotNumber ?? "").trim();
  if (dot) return `dot:${dot}`;
  const mc = (t.mcNumber ?? "").trim();
  if (mc) return `mc:${mc}`;
  const name = normalizeToken(t.companyName);
  if (name) return `name:${name}|${normalizeToken(t.state)}|${normalizeToken(t.city)}`;
  return null;
}

function toNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && String(value).trim() !== "" ? n : undefined;
}

function observedTime(value: string): number {
  const t = Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Resolve a single carrier from its evidence items. `existing`, when supplied,
 * preserves the carrier's id/createdAt and merges prior sources/evidenceIds.
 */
export function resolveCarrierFromEvidence(
  carrierKey: string,
  evidenceItems: TranspoEvidence[],
  existing?: TranspoCarrierTarget,
): TranspoCarrierTarget {
  const items = evidenceItems
    .filter((e) => e.carrierKey === carrierKey)
    .sort((a, b) => observedTime(b.observedAt) - observedTime(a.observedAt));

  const now = new Date().toISOString();
  const { dotNumber, mcNumber } = parseCarrierKey(carrierKey);

  // Strongest identity: highest confidence, latest as tie-breaker (already sorted).
  const identity = [...items]
    .filter((e) => e.evidenceType === "identity")
    .sort((a, b) => b.confidence - a.confidence)[0];

  const latestOf = (type: TranspoEvidence["evidenceType"]) =>
    items.find((e) => e.evidenceType === type);

  const authority = latestOf("authority");
  const contact = latestOf("contact");
  const website = latestOf("website");
  const fleet = latestOf("fleet");
  const location = latestOf("location");

  const fleetFacets = fleet ? parseFacets(fleet.value) : {};
  const locFacets = location ? parseFacets(location.value) : {};

  const sources = Array.from(
    new Set<TranspoSource>([...(existing?.sources ?? []), ...items.map((e) => e.source)]),
  );
  const evidenceIds = Array.from(
    new Set<string>([...(existing?.evidenceIds ?? []), ...items.map((e) => e.id)]),
  );

  return {
    id: existing?.id ?? keyToId(carrierKey),
    companyName: identity?.value || existing?.companyName || "(unnamed carrier)",
    dotNumber: dotNumber ?? existing?.dotNumber,
    mcNumber: mcNumber ?? existing?.mcNumber,
    city: locFacets.city ?? existing?.city,
    state: locFacets.state ?? existing?.state,
    phone: contact?.value ?? existing?.phone,
    website: website?.value ?? existing?.website,
    fleetSize: toNumber(fleetFacets.fleetSize) ?? existing?.fleetSize,
    driverCount: toNumber(fleetFacets.driverCount) ?? existing?.driverCount,
    authorityStatus: authority?.value ?? existing?.authorityStatus,
    sources,
    evidenceIds,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

/**
 * Resolve every carrier present in the evidence lake. Existing carrier-master
 * targets are matched by identity so resolution updates rather than duplicates.
 */
export function resolveAllCarriersFromEvidence(
  evidenceItems: TranspoEvidence[],
  existingCarrierMaster: TranspoCarrierTarget[] = [],
): TranspoCarrierTarget[] {
  const byKey = new Map<string, TranspoEvidence[]>();
  for (const e of evidenceItems) {
    const list = byKey.get(e.carrierKey);
    if (list) list.push(e);
    else byKey.set(e.carrierKey, [e]);
  }

  const existingByKey = new Map<string, TranspoCarrierTarget>();
  for (const t of existingCarrierMaster) {
    const k = targetCarrierKey(t);
    if (k) existingByKey.set(k, t);
  }

  const resolved: TranspoCarrierTarget[] = [];
  for (const [carrierKey, items] of Array.from(byKey.entries())) {
    resolved.push(resolveCarrierFromEvidence(carrierKey, items, existingByKey.get(carrierKey)));
  }
  return resolved;
}
