// lib/transpo/apply-report-failure-signals.ts
// Merge evidence-backed failure signals from acquired reports into Transpo opportunities.

import { readFile, writeFile } from "fs/promises";
import type { ExtractedFailureSignalsArtifact, FailureSignal } from "@/lib/intelligence/reporting/acquisition-types";
import { EXTRACTED_FAILURE_SIGNALS_ARTIFACT_PATH } from "@/lib/intelligence/reporting/paths";
import { METRO_BROKER_COUNTIES } from "@/lib/intelligence/reporting/extract-report-signals";
import type { TranspoOpportunitiesArtifact, TranspoOpportunity } from "./opportunity-types";
import { TRANSPO_OPPORTUNITIES_ARTIFACT_PATH } from "./paths";

const FAILURE_ARTIFACT_PATH = "runtime-data/reporting/extracted-failure-signals.generated.json";

function signalAppliesToCounty(signal: FailureSignal, county: string): boolean {
  if (!signal.appliesToCounties || signal.appliesToCounties.length === 0) return true;
  return signal.appliesToCounties.includes(county);
}

function rationaleFromSignal(signal: FailureSignal): string {
  const summary = signal.summary;
  if (summary.toLowerCase().includes("complaint")) return "Complaint volume elevated (audit evidence).";
  if (summary.toLowerCase().includes("dialysis")) return "Dialysis transport failures reported (contract/audit).";
  if (summary.toLowerCase().includes("corrective action")) return "Corrective action issued (audit).";
  if (summary.toLowerCase().includes("denial")) return "Monthly report shows denial activity (audit evidence).";
  if (summary.toLowerCase().includes("on-time")) return "Timeliness KPI failure documented in audit.";
  return summary.length > 120 ? `${summary.slice(0, 117)}...` : summary;
}

function enrichOpportunity(opp: TranspoOpportunity, signals: FailureSignal[]): TranspoOpportunity {
  const applicable = signals.filter((s) => signalAppliesToCounty(s, opp.county));
  if (applicable.length === 0) return opp;

  const newRationale = [...opp.rationale];
  const seen = new Set(newRationale);
  for (const signal of applicable) {
    const line = rationaleFromSignal(signal);
    if (!seen.has(line)) {
      newRationale.push(line);
      seen.add(line);
    }
  }

  const sourceArtifacts = [...opp.sourceArtifacts];
  if (!sourceArtifacts.includes(FAILURE_ARTIFACT_PATH)) {
    sourceArtifacts.push(FAILURE_ARTIFACT_PATH);
  }

  let actionabilityScore = opp.actionabilityScore;
  const hasCritical = applicable.some((s) => s.severity === "critical");
  const hasHigh = applicable.some((s) => s.severity === "high");
  if (hasCritical && opp.opportunityType !== "low_gap_monitor") actionabilityScore += 10;
  else if (hasHigh && METRO_BROKER_COUNTIES.includes(opp.county)) actionabilityScore += 5;
  actionabilityScore = Math.max(0, Math.min(100, actionabilityScore));

  return {
    ...opp,
    rationale: newRationale,
    sourceArtifacts,
    actionabilityScore,
  };
}

export async function readExtractedFailureSignals(): Promise<ExtractedFailureSignalsArtifact | null> {
  try {
    const raw = await readFile(EXTRACTED_FAILURE_SIGNALS_ARTIFACT_PATH, "utf8");
    return JSON.parse(raw) as ExtractedFailureSignalsArtifact;
  } catch {
    return null;
  }
}

export async function applyExtractedSignalsToOpportunities(
  failureSignals?: ExtractedFailureSignalsArtifact,
): Promise<boolean> {
  const signalsArtifact = failureSignals ?? (await readExtractedFailureSignals());
  if (!signalsArtifact || signalsArtifact.signals.length === 0) return false;

  let artifact: TranspoOpportunitiesArtifact;
  try {
    const raw = await readFile(TRANSPO_OPPORTUNITIES_ARTIFACT_PATH, "utf8");
    artifact = JSON.parse(raw) as TranspoOpportunitiesArtifact;
  } catch {
    return false;
  }

  const enriched = artifact.opportunities.map((o) =>
    enrichOpportunity(o, signalsArtifact.signals),
  );
  enriched.sort((a, b) => b.actionabilityScore - a.actionabilityScore);

  const updated: TranspoOpportunitiesArtifact = {
    ...artifact,
    generatedAt: new Date().toISOString(),
    opportunities: enriched,
    summary: artifact.summary,
  };

  await writeFile(TRANSPO_OPPORTUNITIES_ARTIFACT_PATH, JSON.stringify(updated, null, 2), "utf8");
  return true;
}
