// lib/intelligence/transpo/payers/payer-engine.ts
// Public payer / program registry — Colorado Medicaid/NEMT registry v1 + adapter boundary.

import type { TranspoCountyDemandRecord } from "../demand/demand-types";
import {
  buildColoradoCountyCoverageSummary,
  coloradoPayerRecordsFromRegistry,
  getColoradoMarketPayerMeta,
} from "./colorado/colorado-registry-lookups";
import type { TranspoPayerRecord } from "./payer-types";

export function buildTranspoPayerRecords(
  demandRecords: TranspoCountyDemandRecord[],
): TranspoPayerRecord[] {
  const states = new Set(demandRecords.map((d) => d.state));
  const payers: TranspoPayerRecord[] = [];

  if (states.has("CO") || states.size === 0) {
    payers.push(...coloradoPayerRecordsFromRegistry(demandRecords));
  }

  return payers;
}

export function payerPresenceScoreForMarket(
  payers: TranspoPayerRecord[],
  state: string,
  county: string,
  serviceCategory: string,
): number {
  const st = state.trim().toUpperCase();
  const co = county.trim().toLowerCase();

  if (st === "CO") {
    const meta = getColoradoMarketPayerMeta(county, serviceCategory);
    if (meta.payerStatus === "missing") return 0;
    const base = meta.payerStatus === "live" ? 50 : 35;
    return Math.min(85, base + meta.payerPresenceBoost);
  }

  const matches = payers.filter((p) => {
    if (p.state !== st) return false;
    const regionMatch =
      p.region.toLowerCase() === "statewide" ||
      p.region.toLowerCase() === co ||
      p.region.toLowerCase().includes(co);
    const svc = p.serviceCategories.includes(serviceCategory);
    return regionMatch && svc;
  });
  if (matches.length === 0) return 0;
  const hasLive = matches.some((p) => p.sourceStatus === "live");
  if (hasLive && matches.length >= 2) return 75;
  if (hasLive) return 60;
  if (matches.length >= 3) return 55;
  if (matches.length === 2) return 45;
  return 35;
}

export { getColoradoMarketPayerMeta, buildColoradoCountyCoverageSummary };
