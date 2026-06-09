// lib/transpo/build-transpo-opportunities.ts
// Synthesize ranked county opportunities from demand, capacity, evidence, and research inputs.

import { mkdir, readFile, writeFile } from "fs/promises";
import type { CountyEvidenceDossier } from "./evidence-types";
import { calculateOpportunityScore } from "./build-county-gap-analysis";
import type {
  TranspoOpportunitiesArtifact,
  TranspoOpportunitiesSummary,
  TranspoOpportunity,
  TranspoOpportunityConfidence,
  TranspoOpportunityDemandAnchors,
  TranspoOpportunityType,
} from "./opportunity-types";
import {
  TRANSPO_OPPORTUNITY_NEXT_ACTIONS,
  TRANSPO_OPPORTUNITY_TYPE_LABELS,
} from "./opportunity-types";
import {
  COUNTY_CAPACITY_ARTIFACT_PATH,
  COUNTY_DEMAND_DOSSIERS_ARTIFACT_PATH,
  COUNTY_EVIDENCE_DOSSIERS_ARTIFACT_PATH,
  COUNTY_RESEARCH_SUMMARY_ARTIFACT_PATH,
  TRANSPO_DATA_DIR,
  TRANSPO_OPPORTUNITIES_ARTIFACT_PATH,
} from "./paths";
import type { CountyCapacity, CountyCapacityArtifact } from "./provider-types";
import type { CountyDemandDossier, CountyDemandDossiersArtifact, DemandGenerator } from "./types";

const SOURCE_ARTIFACTS = [
  "runtime-data/transpo/county-demand-dossiers.generated.json",
  "runtime-data/transpo/county-capacity.generated.json",
  "runtime-data/transpo/county-evidence-dossiers.generated.json",
  "runtime-data/transpo/county-research-summary.generated.json",
];

const CRITICAL_EVIDENCE_KEYS = [
  "vehicle_count",
  "driver_count",
  "wheelchair_vehicle_count",
  "monthly_trip_volume",
] as const;

const TYPE_PRIORITY: TranspoOpportunityType[] = [
  "provider_capacity_gap",
  "broker_transition_gap",
  "wheelchair_gap",
  "hospital_discharge_gap",
  "dialysis_transport_gap",
  "meal_route_gap",
  "rural_anchor_bundle",
  "low_gap_monitor",
  "research_priority",
];

async function loadJson<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function anchorNames(generators: DemandGenerator[], category: string): string[] {
  return generators
    .filter((g) => g.category === category)
    .map((g) => g.displayName)
    .sort();
}

function buildDemandAnchors(generators: DemandGenerator[]): TranspoOpportunityDemandAnchors {
  return {
    hospitals: anchorNames(generators, "hospital"),
    dialysis: anchorNames(generators, "dialysis"),
    mealPrograms: anchorNames(generators, "meal_program"),
    seniorCenters: anchorNames(generators, "senior_center"),
    va: anchorNames(generators, "va"),
    behavioralHealth: anchorNames(generators, "behavioral_health"),
  };
}

function hasAnyAnchor(anchors: TranspoOpportunityDemandAnchors): boolean {
  return (
    anchors.hospitals.length > 0 ||
    anchors.dialysis.length > 0 ||
    anchors.mealPrograms.length > 0 ||
    anchors.seniorCenters.length > 0 ||
    anchors.va.length > 0 ||
    anchors.behavioralHealth.length > 0
  );
}

function isEvidenceMissing(dossier: CountyEvidenceDossier | undefined, key: string): boolean {
  if (!dossier) return true;
  return dossier.missing.some((m) => m.key === key);
}

function criticalMissingKeys(dossier: CountyEvidenceDossier | undefined): string[] {
  if (!dossier) return [...CRITICAL_EVIDENCE_KEYS];
  return dossier.missing
    .filter((m) => (CRITICAL_EVIDENCE_KEYS as readonly string[]).includes(m.key))
    .map((m) => m.key);
}

function criticalMissingLabels(dossier: CountyEvidenceDossier | undefined): string[] {
  if (!dossier) return CRITICAL_EVIDENCE_KEYS.map((k) => k.replace(/_/g, " "));
  return dossier.missing
    .filter((m) => (CRITICAL_EVIDENCE_KEYS as readonly string[]).includes(m.key))
    .map((m) => m.label);
}

interface CountyContext {
  county: CountyCapacity;
  demand: CountyDemandDossier | undefined;
  evidence: CountyEvidenceDossier | undefined;
  demandScore: number;
  capacityScore: number;
  providerCount: number;
  ruralAnchorScore: number;
  evidenceCompletenessScore: number;
  researchPriority: "low" | "medium" | "high";
  opportunityScore: number;
  anchors: TranspoOpportunityDemandAnchors;
  generators: DemandGenerator[];
  missingData: string[];
  missingCritical: string[];
  criticalMissingCount: number;
}

function buildCountyContext(
  county: CountyCapacity,
  demand: CountyDemandDossier | undefined,
  evidence: CountyEvidenceDossier | undefined,
): CountyContext {
  const generators = demand?.demandGenerators ?? [];
  const demandScore = demand?.demandScore ?? 0;
  const capacityScore = county.capacityScore;
  const providerCount = county.providerCount;
  const ruralAnchorScore = demand?.ruralAnchorScore ?? 0;
  const evidenceCompletenessScore = evidence?.evidenceCompletenessScore ?? 0;
  const researchPriority = evidence?.researchPriority ?? "medium";
  const opportunityScore = demand
    ? calculateOpportunityScore(demand, capacityScore, providerCount)
    : Math.max(0, Math.min(100, demandScore - capacityScore));

  return {
    county,
    demand,
    evidence,
    demandScore,
    capacityScore,
    providerCount,
    ruralAnchorScore,
    evidenceCompletenessScore,
    researchPriority,
    opportunityScore,
    anchors: buildDemandAnchors(generators),
    generators,
    missingData: demand?.missingData ?? [],
    missingCritical: criticalMissingKeys(evidence),
    criticalMissingCount: criticalMissingKeys(evidence).length,
  };
}

function matchesProviderCapacityGap(ctx: CountyContext): boolean {
  return ctx.demandScore >= 60 && ctx.capacityScore <= 40;
}

function matchesRuralAnchorBundle(ctx: CountyContext): boolean {
  const hasAnchor =
    ctx.anchors.hospitals.length > 0 ||
    ctx.anchors.dialysis.length > 0 ||
    ctx.anchors.mealPrograms.length > 0;
  return ctx.ruralAnchorScore >= 60 && hasAnchor && ctx.evidenceCompletenessScore < 50;
}

function matchesWheelchairGap(ctx: CountyContext): boolean {
  const hasClinicalAnchor =
    ctx.anchors.hospitals.length > 0 || ctx.anchors.dialysis.length > 0;
  if (!hasClinicalAnchor) return false;
  if (!isEvidenceMissing(ctx.evidence, "wheelchair_vehicle_count")) return false;
  return ctx.providerCount <= 5 || ctx.evidenceCompletenessScore < 40;
}

function matchesHospitalDischargeGap(ctx: CountyContext): boolean {
  if (ctx.anchors.hospitals.length === 0) return false;
  const dischargeMissing = isEvidenceMissing(ctx.evidence, "hospital_discharge_delays");
  const volumeMissing = ctx.missingData.includes("hospital_volume_missing");
  if (!dischargeMissing && !volumeMissing) return false;
  return ctx.evidenceCompletenessScore < 50;
}

function matchesDialysisTransportGap(ctx: CountyContext): boolean {
  if (ctx.anchors.dialysis.length === 0) return false;
  const stationMissing = ctx.missingData.includes("dialysis_station_count_missing");
  const tripVolumeMissing = isEvidenceMissing(ctx.evidence, "monthly_trip_volume");
  return stationMissing || tripVolumeMissing;
}

function matchesMealRouteGap(ctx: CountyContext): boolean {
  return (
    ctx.anchors.mealPrograms.length > 0 &&
    ctx.missingData.includes("meals_volume_missing")
  );
}

function matchesBrokerTransitionGap(ctx: CountyContext): boolean {
  const recruitingKnown = Boolean(
    ctx.evidence?.known.some((k) => k.key === "provider_recruiting_activity"),
  );
  const brokerOverflowKnown = Boolean(
    ctx.evidence?.known.some((k) => k.key === "broker_overflow_counts"),
  );
  const signalPresent =
    recruitingKnown ||
    brokerOverflowKnown ||
    !ctx.missingData.includes("broker_recruitment_signal_missing");
  return signalPresent && (recruitingKnown || brokerOverflowKnown);
}

function hasStrongDistressSignals(ctx: CountyContext): boolean {
  if (matchesProviderCapacityGap(ctx)) return true;
  if (ctx.providerCount <= 3 && ctx.demandScore >= 40) return true;
  const complaintKnown = ctx.evidence?.known.some((k) => k.key === "complaint_volume");
  const overflowKnown = ctx.evidence?.known.some((k) => k.key === "broker_overflow_counts");
  return Boolean(complaintKnown || overflowKnown);
}

function matchesLowGapMonitor(ctx: CountyContext): boolean {
  return (
    ctx.capacityScore >= 80 &&
    ctx.providerCount >= 8 &&
    !hasStrongDistressSignals(ctx)
  );
}

function matchesResearchPriority(ctx: CountyContext): boolean {
  return ctx.researchPriority === "high" && ctx.criticalMissingCount >= 3;
}

const MATCHERS: Record<TranspoOpportunityType, (ctx: CountyContext) => boolean> = {
  provider_capacity_gap: matchesProviderCapacityGap,
  rural_anchor_bundle: matchesRuralAnchorBundle,
  wheelchair_gap: matchesWheelchairGap,
  hospital_discharge_gap: matchesHospitalDischargeGap,
  dialysis_transport_gap: matchesDialysisTransportGap,
  meal_route_gap: matchesMealRouteGap,
  broker_transition_gap: matchesBrokerTransitionGap,
  research_priority: matchesResearchPriority,
  low_gap_monitor: matchesLowGapMonitor,
};

function classifyOpportunityType(ctx: CountyContext): TranspoOpportunityType | null {
  const matched = TYPE_PRIORITY.filter((type) => MATCHERS[type](ctx));
  if (matched.length === 0) return null;

  if (matched.includes("low_gap_monitor") && matched.includes("research_priority")) {
    return "low_gap_monitor";
  }
  return matched[0] ?? null;
}

function computeConfidence(
  ctx: CountyContext,
  opportunityType: TranspoOpportunityType,
): TranspoOpportunityConfidence {
  if (
    ctx.demandScore >= 60 &&
    ctx.capacityScore <= 40 &&
    ctx.evidenceCompletenessScore >= 40
  ) {
    return "high";
  }

  const hasAnchors = hasAnyAnchor(ctx.anchors);
  const capacityWeak = ctx.capacityScore <= 40;
  const hasCriticalMissing = ctx.criticalMissingCount >= 1;

  if (opportunityType === "low_gap_monitor") return "low";
  if (ctx.providerCount >= 8 && ctx.capacityScore >= 80) return "low";
  if (hasAnchors && (capacityWeak || hasCriticalMissing)) return "medium";
  return "low";
}

function computeActionabilityScore(ctx: CountyContext): number {
  let score = ctx.demandScore;

  if (ctx.capacityScore <= 40) score += 20;
  if (ctx.providerCount <= 3) score += 15;
  if (ctx.missingCritical.includes("vehicle_count")) score += 15;
  if (ctx.missingCritical.includes("driver_count")) score += 15;
  if (ctx.anchors.hospitals.length > 0) score += 10;
  if (ctx.anchors.dialysis.length > 0) score += 10;
  if (ctx.anchors.mealPrograms.length > 0) score += 10;
  if (ctx.capacityScore >= 80 && ctx.providerCount >= 8) score -= 25;
  if (ctx.evidenceCompletenessScore < 30) score -= 15;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildRationale(ctx: CountyContext, opportunityType: TranspoOpportunityType): string[] {
  const lines: string[] = [];

  if (ctx.anchors.hospitals.length > 0) {
    lines.push(`Hospital anchor present: ${ctx.anchors.hospitals[0]}`);
  }
  if (ctx.anchors.dialysis.length > 0) {
    lines.push("Dialysis anchor present");
  }
  if (ctx.anchors.mealPrograms.length > 0) {
    lines.push("Meal program anchor present");
  }
  if (ctx.anchors.seniorCenters.length > 0) {
    lines.push("Senior center anchor present");
  }

  if (ctx.providerCount > 0) {
    lines.push(`${ctx.providerCount} credentialed providers listed by HCPF`);
  }

  lines.push(`Demand score ${ctx.demandScore}, capacity score ${ctx.capacityScore}`);
  lines.push(`Evidence completeness only ${ctx.evidenceCompletenessScore}%`);

  const criticalLabels = criticalMissingLabels(ctx.evidence);
  if (criticalLabels.length > 0) {
    lines.push(`Critical capacity evidence missing: ${criticalLabels.join(", ").toLowerCase()}`);
  } else if (ctx.missingCritical.length > 0) {
    lines.push("Critical capacity evidence still missing.");
  }

  if (opportunityType === "low_gap_monitor") {
    lines.push("High credentialed capacity — monitor unless operational distress appears.");
  }
  if (opportunityType === "research_priority") {
    lines.push(`Research priority ${ctx.researchPriority} with ${ctx.criticalMissingCount} critical evidence gaps.`);
  }
  if (opportunityType === "provider_capacity_gap") {
    lines.push("Demand exceeds visible provider capacity in this county.");
  }

  return lines;
}

function buildTitle(county: string, opportunityType: TranspoOpportunityType): string {
  return `${county} — ${TRANSPO_OPPORTUNITY_TYPE_LABELS[opportunityType]}`;
}

function buildSummary(ctx: CountyContext, opportunityType: TranspoOpportunityType): string {
  const typeLabel = TRANSPO_OPPORTUNITY_TYPE_LABELS[opportunityType].toLowerCase();
  if (opportunityType === "low_gap_monitor") {
    return `${ctx.county.county} shows strong credentialed capacity (${ctx.providerCount} providers) with incomplete operational evidence — classified as ${typeLabel}, not a high-confidence service gap.`;
  }
  if (opportunityType === "research_priority") {
    return `${ctx.county.county} has demand anchors but ${ctx.evidenceCompletenessScore}% evidence completeness — complete research before treating as a ranked service opportunity.`;
  }
  return `${ctx.county.county} classified as ${typeLabel} from demand anchors (${ctx.demandScore}), capacity (${ctx.capacityScore}), and evidence gaps — confidence reflects known data only, not estimated unmet ride counts.`;
}

function synthesizeCountyOpportunity(
  ctx: CountyContext,
  generatedAt: string,
): TranspoOpportunity | null {
  const opportunityType = classifyOpportunityType(ctx);
  if (!opportunityType) return null;

  const confidence = computeConfidence(ctx, opportunityType);
  const actionabilityScore = computeActionabilityScore(ctx);

  return {
    opportunityKey: `${ctx.county.countyKey}:${opportunityType}`,
    countyKey: ctx.county.countyKey,
    county: ctx.county.county,
    state: ctx.county.state,
    opportunityType,
    title: buildTitle(ctx.county.county, opportunityType),
    summary: buildSummary(ctx, opportunityType),
    demandScore: ctx.demandScore,
    capacityScore: ctx.capacityScore,
    opportunityScore: ctx.opportunityScore,
    evidenceCompletenessScore: ctx.evidenceCompletenessScore,
    researchPriority: ctx.researchPriority,
    providerCount: ctx.providerCount,
    demandAnchors: ctx.anchors,
    topProviders: ctx.county.providers.slice(0, 8),
    missingCriticalEvidence: ctx.missingCritical,
    confidence,
    actionabilityScore,
    nextAction: TRANSPO_OPPORTUNITY_NEXT_ACTIONS[opportunityType],
    rationale: buildRationale(ctx, opportunityType),
    sourceArtifacts: SOURCE_ARTIFACTS,
    generatedAt,
  };
}

function buildSummaryStats(opportunities: TranspoOpportunity[]): TranspoOpportunitiesSummary {
  const byType = {} as TranspoOpportunitiesSummary["byType"];
  const byConfidence = {} as TranspoOpportunitiesSummary["byConfidence"];

  for (const type of TYPE_PRIORITY) {
    byType[type] = opportunities.filter((o) => o.opportunityType === type).length;
  }
  for (const conf of ["high", "medium", "low"] as const) {
    byConfidence[conf] = opportunities.filter((o) => o.confidence === conf).length;
  }

  const topHighConfidence = [...opportunities]
    .filter((o) => o.confidence === "high")
    .sort((a, b) => b.actionabilityScore - a.actionabilityScore)
    .slice(0, 10);

  const topResearchPriority = [...opportunities]
    .filter((o) => o.opportunityType === "research_priority")
    .sort((a, b) => b.actionabilityScore - a.actionabilityScore)
    .slice(0, 10);

  return { byType, byConfidence, topHighConfidence, topResearchPriority };
}

export async function buildTranspoOpportunities(
  generatedAt = new Date().toISOString(),
): Promise<TranspoOpportunitiesArtifact> {
  const [capacityArtifact, demandArtifact, evidenceArtifact] = await Promise.all([
    loadJson<CountyCapacityArtifact>(COUNTY_CAPACITY_ARTIFACT_PATH),
    loadJson<CountyDemandDossiersArtifact>(COUNTY_DEMAND_DOSSIERS_ARTIFACT_PATH),
    loadJson<{ dossiers: CountyEvidenceDossier[] }>(COUNTY_EVIDENCE_DOSSIERS_ARTIFACT_PATH),
  ]);

  if (!capacityArtifact) {
    throw new Error("county-capacity artifact missing — run npm run build:transpo:providers");
  }
  if (!evidenceArtifact) {
    throw new Error("county-evidence-dossiers artifact missing — run npm run build:transpo:evidence");
  }

  const demandByKey = new Map(
    (demandArtifact?.dossiers ?? []).map((d) => [d.countyKey, d]),
  );
  const evidenceByKey = new Map(
    evidenceArtifact.dossiers.map((d) => [d.countyKey, d]),
  );

  const opportunities: TranspoOpportunity[] = [];

  for (const county of capacityArtifact.counties) {
    const demand = demandByKey.get(county.countyKey);
    const evidence = evidenceByKey.get(county.countyKey);
    const ctx = buildCountyContext(county, demand, evidence);
    const opp = synthesizeCountyOpportunity(ctx, generatedAt);
    if (opp) opportunities.push(opp);
  }

  opportunities.sort((a, b) => b.actionabilityScore - a.actionabilityScore);

  const artifact: TranspoOpportunitiesArtifact = {
    generatedAt,
    total: opportunities.length,
    opportunities,
    summary: buildSummaryStats(opportunities),
  };

  await mkdir(TRANSPO_DATA_DIR, { recursive: true });
  await writeFile(TRANSPO_OPPORTUNITIES_ARTIFACT_PATH, JSON.stringify(artifact, null, 2), "utf8");

  return artifact;
}
