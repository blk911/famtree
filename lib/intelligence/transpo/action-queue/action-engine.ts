// lib/intelligence/transpo/action-queue/action-engine.ts

import type { CountyOpportunityDossier } from "../opportunity-dossiers/county-opportunity-types";
import type { TranspoServiceDeficitRecord } from "../service-deficits/deficit-types";
import type {
  TranspoActionDecision,
  TranspoActionQueueRecord,
  TranspoActionStatus,
} from "./action-types";

export function actionQueueKey(county: string, state: string, serviceCategory: string): string {
  return `${county}|${state.toUpperCase()}|${serviceCategory}`.toLowerCase();
}

export function actionRecordId(county: string, state: string, serviceCategory: string): string {
  return `action-${county}-${state}-${serviceCategory}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
}

export function severityFromOpportunity(dossier: CountyOpportunityDossier): string {
  if (dossier.actionabilityBand === "immediate") return "critical";
  if (dossier.actionabilityBand === "priority") return "high";
  if (dossier.actionabilityBand === "investigate") return "medium";
  return "low";
}

export function buildActionFromCountyOpportunity(
  dossier: CountyOpportunityDossier,
  now = new Date().toISOString(),
): TranspoActionQueueRecord {
  return {
    id: actionRecordId(dossier.county, dossier.state, dossier.serviceCategory),
    county: dossier.county,
    state: dossier.state,
    serviceCategory: dossier.serviceCategory,
    deficitScore: dossier.deficitScore,
    confidenceScore: dossier.confidenceScore,
    actionabilityScore: dossier.actionabilityScore,
    severity: severityFromOpportunity(dossier),
    recommendedPlay: dossier.recommendedPlay,
    decision: "unreviewed",
    status: "new",
    providerCount: dossier.providerCount,
    payerName: dossier.brokerName ?? dossier.payers[0]?.name,
    countyOpportunityId: dossier.id,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildActionFromServiceDeficit(
  deficit: TranspoServiceDeficitRecord,
  actionabilityScore?: number,
  now = new Date().toISOString(),
): TranspoActionQueueRecord {
  const oppId = `opp-${deficit.county}-${deficit.state}-${deficit.serviceCategory}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-");
  const conf = deficit.dataConfidence?.confidenceScore ?? 0;
  const actionability =
    actionabilityScore ??
    Math.round(deficit.deficitScore * 0.4 + conf * 0.25 + deficit.payerPresenceScore * 0.2);

  return {
    id: actionRecordId(deficit.county, deficit.state, deficit.serviceCategory),
    county: deficit.county,
    state: deficit.state,
    serviceCategory: deficit.serviceCategory,
    deficitScore: deficit.deficitScore,
    confidenceScore: conf,
    actionabilityScore: actionability,
    severity: deficit.severity,
    recommendedPlay: deficit.revenueOpportunity.recommendedPlay,
    decision: "unreviewed",
    status: "new",
    providerCount: deficit.providerCount,
    payerName: deficit.brokerName,
    countyOpportunityId: oppId,
    createdAt: now,
    updatedAt: now,
  };
}

export function findDuplicate(
  records: TranspoActionQueueRecord[],
  county: string,
  state: string,
  serviceCategory: string,
): TranspoActionQueueRecord | undefined {
  const key = actionQueueKey(county, state, serviceCategory);
  return records.find(
    (r) =>
      r.status !== "closed" &&
      actionQueueKey(r.county, r.state, r.serviceCategory) === key,
  );
}

export function promoteToActionQueue(
  records: TranspoActionQueueRecord[],
  incoming: TranspoActionQueueRecord,
): { records: TranspoActionQueueRecord[]; created: boolean; duplicate: boolean } {
  const dup = findDuplicate(records, incoming.county, incoming.state, incoming.serviceCategory);
  if (dup) {
    return { records, created: false, duplicate: true };
  }
  return { records: [...records, incoming], created: true, duplicate: false };
}

export function updateActionRecord(
  existing: TranspoActionQueueRecord,
  patch: Partial<Pick<TranspoActionQueueRecord, "decision" | "status" | "notes">>,
): TranspoActionQueueRecord {
  return {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}

export const ACTION_DECISIONS: TranspoActionDecision[] = [
  "unreviewed",
  "investigate",
  "partner",
  "acquire",
  "launch",
  "watch",
  "reject",
];

export const ACTION_STATUSES: TranspoActionStatus[] = [
  "new",
  "active",
  "waiting",
  "completed",
  "closed",
];

export function actionabilityTier(score: number): "immediate" | "priority" | "investigate" | "watch" {
  if (score >= 75) return "immediate";
  if (score >= 50) return "priority";
  if (score >= 25) return "investigate";
  return "watch";
}
