// lib/intelligence/reporting/build-live-opportunities.ts

import { readFile, writeFile } from "fs/promises";
import type { ExtractedFailureSignalsArtifact } from "./acquisition-types";
import type {
  LiveOpportunityAcquisitionMethod,
  LiveOpportunityAcquisitionStatus,
  LiveOpportunityConfidence,
  LiveOpportunityTarget,
  LiveOpportunityTargetType,
  LiveOpportunityTargetsArtifact,
  StartHereItem,
} from "./live-opportunity-types";
import {
  AUDIT_FINDINGS_ARTIFACT_PATH,
  EXTRACTED_FAILURE_SIGNALS_ARTIFACT_PATH,
  KPI_REGISTRY_ARTIFACT_PATH,
  LIVE_OPPORTUNITY_TARGETS_ARTIFACT_PATH,
  OPERATIONAL_STRESS_SIGNALS_ARTIFACT_PATH,
  REPORT_TARGETS_ARTIFACT_PATH,
  REQUEST_PACKAGES_ARTIFACT_PATH,
  REQUEST_TEMPLATES_ARTIFACT_PATH,
} from "./paths";
import type { AuditFindingsArtifact, KpiRegistryArtifact, OperationalStressSignalsArtifact } from "./reporting-types";
import type { ReportTarget, ReportTargetsArtifact, RequestTemplatesArtifact } from "./target-types";

interface TargetScoring {
  targetType: LiveOpportunityTargetType;
  insightValue: number;
  probabilityOfUsefulSignal: number;
  acquisitionDifficulty: number;
  confidence: LiveOpportunityConfidence;
  whyItMatters: string;
  expectedQuestionsAnswered: string[];
  expectedFields: string[];
  expectedOpportunitySignals: string[];
  nextAction: string;
  acquiredRankPenalty?: number;
  decisionScoreOverride?: number;
}

const SCORING: Record<string, TargetScoring> = {
  "target:monthly-performance-report": {
    targetType: "report",
    insightValue: 100,
    probabilityOfUsefulSignal: 95,
    acquisitionDifficulty: 25,
    confidence: "high",
    whyItMatters:
      "Contract-required monthly report is the primary broker ledger for denials, no-shows, completion rates, and complaint volume — more valuable than county scoring for exposing real unmet demand.",
    expectedQuestionsAnswered: [
      "How many trips were denied?",
      "What were the denial reasons?",
      "Were denials tied to provider availability?",
      "Were complaints concentrated by month or region?",
      "Did call center KPIs fail?",
      "Were no-shows or cancellations abnormal?",
    ],
    expectedFields: [
      "trips requested",
      "trips completed",
      "trips denied",
      "denial reason",
      "no-shows",
      "complaints per 1,000 trips",
      "on-time pickup",
      "call abandonment",
      "call wait time",
    ],
    expectedOpportunitySignals: [
      "provider shortage",
      "geographic service gap",
      "dispatch failure",
      "broker performance failure",
      "complaint concentration",
    ],
    nextAction: "Submit CORA request using tpl:cora-nemt-monthly-performance — request last 12 months of broker Monthly Performance Reports from HCPF.",
    decisionScoreOverride: 100,
  },
  "target:monthly-dialysis-report": {
    targetType: "report",
    insightValue: 95,
    probabilityOfUsefulSignal: 90,
    acquisitionDifficulty: 25,
    confidence: "high",
    whyItMatters:
      "Dialysis transport failures directly indicate high-acuity unmet medical transportation demand — missed treatments due to late or failed NEMT rides.",
    expectedQuestionsAnswered: [
      "Which dialysis trips were late?",
      "Were dialysis treatments missed due to transport?",
      "Were failures recurring by region, provider, or month?",
      "Are dialysis transport failures tied to scheduling or capacity?",
    ],
    expectedFields: [
      "dialysis trips",
      "late dialysis pickups",
      "missed dialysis transportation",
      "no-shows",
      "provider failure reasons",
      "impacted locations",
    ],
    expectedOpportunitySignals: [
      "dialysis transport gap",
      "recurring medical transport failure",
      "high-acuity capacity shortage",
      "provider reliability issue",
    ],
    nextAction: "Include Monthly Dialysis Report in the same CORA package as Monthly Performance Report (tpl:cora-nemt-monthly-performance).",
    decisionScoreOverride: 98,
  },
  "target:complaint-investigation-summaries": {
    targetType: "complaint_records",
    insightValue: 90,
    probabilityOfUsefulSignal: 85,
    acquisitionDifficulty: 30,
    confidence: "high",
    whyItMatters:
      "Complaint investigation summaries reveal what members are actually experiencing — no-shows, late pickups, scheduling failures — and which providers or counties repeat.",
    expectedQuestionsAnswered: [
      "What are members complaining about?",
      "Are complaints about no-shows, late pickups, scheduling, driver behavior, or fraud?",
      "Which counties/providers appear repeatedly?",
      "How many complaints remain unresolved?",
    ],
    expectedFields: [
      "complaint date",
      "complaint category",
      "county",
      "provider if disclosed",
      "resolution status",
      "investigation outcome",
    ],
    expectedOpportunitySignals: [
      "complaint spike",
      "recurring provider failure",
      "unresolved service failure",
      "dispatch/scheduling bottleneck",
    ],
    nextAction: "Submit CORA request using tpl:cora-nemt-complaints for broker complaint investigation summaries.",
    decisionScoreOverride: 96,
  },
  "target:nemt-complaint-intake-records": {
    targetType: "complaint_records",
    insightValue: 90,
    probabilityOfUsefulSignal: 85,
    acquisitionDifficulty: 30,
    confidence: "high",
    whyItMatters:
      "HCPF complaint intake records capture member-reported failures before broker investigation — aggregate volume by category and county exposes service stress.",
    expectedQuestionsAnswered: [
      "What are members complaining about?",
      "Are complaints about no-shows, late pickups, scheduling, driver behavior, or fraud?",
      "Which counties/providers appear repeatedly?",
      "How many complaints remain unresolved?",
    ],
    expectedFields: [
      "complaint date",
      "complaint category",
      "county",
      "provider if disclosed",
      "resolution status",
      "investigation outcome",
    ],
    expectedOpportunitySignals: [
      "complaint spike",
      "recurring provider failure",
      "unresolved service failure",
      "dispatch/scheduling bottleneck",
    ],
    nextAction: "Submit CORA request using tpl:cora-nemt-complaints for aggregate NEMT member feedback intake statistics.",
    decisionScoreOverride: 95,
  },
  "target:corrective-action-plans": {
    targetType: "corrective_action",
    insightValue: 85,
    probabilityOfUsefulSignal: 75,
    acquisitionDifficulty: 35,
    confidence: "medium",
    whyItMatters: "Corrective actions document confirmed KPI failures and mandated remediation — evidence of systemic broker underperformance.",
    expectedQuestionsAnswered: [
      "What KPI failures triggered corrective action?",
      "What remediation was required?",
      "Were prior audit findings addressed?",
    ],
    expectedFields: ["corrective action date", "failure type", "remediation deadline", "repeat violations"],
    expectedOpportunitySignals: ["corrective action issued", "repeat KPI failure", "broker compliance gap"],
    nextAction: "Add corrective action plans to CORA complaint/performance request package.",
  },
  "target:provider-adequacy-reviews": {
    targetType: "provider_adequacy",
    insightValue: 80,
    probabilityOfUsefulSignal: 70,
    acquisitionDifficulty: 35,
    confidence: "medium",
    whyItMatters: "Provider adequacy sections expose no-provider-available denials and county-level network gaps.",
    expectedQuestionsAnswered: [
      "Where is provider network inadequate?",
      "How many denials cite no provider available?",
      "Which counties have wheelchair or ambulance shortages?",
    ],
    expectedFields: ["denials by reason", "provider count by county", "no-show rate by provider", "mode availability"],
    expectedOpportunitySignals: ["provider shortage", "geographic service gap", "wheelchair capacity gap"],
    nextAction: "Request provider adequacy section within Monthly Performance Report CORA package.",
  },
  "target:audit-follow-up-reports": {
    targetType: "audit",
    insightValue: 75,
    probabilityOfUsefulSignal: 65,
    acquisitionDifficulty: 25,
    confidence: "medium",
    whyItMatters: "Follow-up reports would show whether 2021 OSA audit corrective actions reduced complaint and incident failures.",
    expectedQuestionsAnswered: [
      "Were OSA audit recommendations implemented?",
      "Did complaint resolution rates improve?",
      "Are incident reporting gaps closed?",
    ],
    expectedFields: ["corrective action status", "updated complaint metrics", "repeat findings"],
    expectedOpportunitySignals: ["unresolved audit finding", "repeat compliance failure"],
    nextAction: "State records request to OSA or HCPF for NEMT audit follow-up status.",
  },
  "target:rac-audit-findings": {
    targetType: "audit",
    insightValue: 70,
    probabilityOfUsefulSignal: 55,
    acquisitionDifficulty: 40,
    confidence: "low",
    whyItMatters: "RAC findings may reveal claims paid without proof of ride — indirect signal of completion and denial patterns.",
    expectedQuestionsAnswered: [
      "How many NEMT claims lacked ride proof?",
      "Which providers had billing compliance failures?",
    ],
    expectedFields: ["noncompliant claim count", "overpayment amount", "provider name", "finding type"],
    expectedOpportunitySignals: ["claims without ride proof", "billing compliance failure"],
    nextAction: "CORA request using tpl:cora-nemt-rac-audits for aggregate NEMT RAC findings.",
  },
  "target:osa-nemt-audit-2021": {
    targetType: "audit",
    insightValue: 80,
    probabilityOfUsefulSignal: 80,
    acquisitionDifficulty: 5,
    confidence: "high",
    whyItMatters: "Already acquired — 68% complaints unresolved, 75 unreported incidents. Reference baseline; live monthly reports needed for current state.",
    expectedQuestionsAnswered: [
      "What failure rates did the 2021 audit document?",
      "What corrective actions were required?",
    ],
    expectedFields: ["complaints unresolved %", "incidents unreported", "noncompliant claims $"],
    expectedOpportunitySignals: ["complaint spike", "incident reporting gap", "claims without ride proof"],
    nextAction: "Use as evidence basis — pursue Monthly Performance Report for current operational metrics.",
    acquiredRankPenalty: 45,
  },
  "target:hcpf-nemt-contract": {
    targetType: "contract_kpi",
    insightValue: 70,
    probabilityOfUsefulSignal: 65,
    acquisitionDifficulty: 5,
    confidence: "high",
    whyItMatters: "Already acquired — defines KPI baselines and monthly report schema. Not live operational data.",
    expectedQuestionsAnswered: [
      "What KPIs must the broker report monthly?",
      "What denial and dialysis fields are contractually required?",
    ],
    expectedFields: ["on-time pickup target", "call abandonment target", "monthly report schema"],
    expectedOpportunitySignals: ["contract KPI baseline", "reporting requirement mapped"],
    nextAction: "Reference for CORA request field list — acquire actual monthly submissions.",
    acquiredRankPenalty: 50,
  },
};

const START_HERE_KEYS = [
  "target:monthly-performance-report",
  "target:monthly-dialysis-report",
  "target:complaint-investigation-summaries",
];

async function loadJson<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function computeDecisionScore(
  insightValue: number,
  probability: number,
  difficulty: number,
  penalty = 0,
): number {
  const raw = (insightValue * probability) / 100 - difficulty - penalty;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

function mapAcquisitionStatus(target: ReportTarget): LiveOpportunityAcquisitionStatus {
  if (target.status === "failed") return "failed";
  if (target.workflowStage === "signals_generated" || target.workflowStage === "extracted") return "extracted";
  if (target.status === "acquired") return "acquired";
  if (target.status === "requested") return "requested";
  if (target.status === "request_ready") return "request_ready";
  return "identified";
}

function mapAcquisitionMethod(method: ReportTarget["acquisitionMethod"]): LiveOpportunityAcquisitionMethod {
  if (method === "contract_request") return "contract_request";
  if (method === "state_records_request") return "state_records_request";
  if (method === "public_download") return "public_download";
  if (method === "cora") return "cora";
  if (method === "foia") return "foia";
  return "unknown";
}

function templateForTarget(
  targetKey: string,
  templates: RequestTemplatesArtifact | null,
): string | undefined {
  if (!templates) return undefined;
  const match = templates.templates.find((t) => t.targetKeys.includes(targetKey));
  return match?.templateKey;
}

function evidenceForTarget(
  targetKey: string,
  auditFindings: AuditFindingsArtifact | null,
  kpis: KpiRegistryArtifact | null,
  stress: OperationalStressSignalsArtifact | null,
  failureSignals: ExtractedFailureSignalsArtifact | null,
): string[] {
  const basis: string[] = [];

  if (targetKey.includes("performance") || targetKey.includes("dialysis") || targetKey.includes("provider")) {
    basis.push("HCPF NEMT contract §5.10.2 requires monthly performance reporting to HCPF.");
    const kpiCount = kpis?.total ?? 0;
    if (kpiCount > 0) basis.push(`${kpiCount} contract KPIs defined in kpi-registry (on-time pickup, call abandonment, denials).`);
  }

  if (targetKey.includes("complaint")) {
    basis.push("OSA 2021 audit: 68% of broker complaints unresolved during audit period.");
    const complaintFinding = auditFindings?.findings.find((f) => f.findingKey.includes("complaint"));
    if (complaintFinding) basis.push(complaintFinding.finding);
  }

  const stressMatch = stress?.signals.filter(
    (s) =>
      (targetKey.includes("complaint") && s.signalType === "complaint_pattern") ||
      (targetKey.includes("dialysis") && s.summary.toLowerCase().includes("dialysis")) ||
      (targetKey.includes("performance") && s.signalType === "reporting_gap"),
  );
  for (const s of stressMatch?.slice(0, 2) ?? []) {
    basis.push(s.summary);
  }

  if (targetKey === "target:osa-nemt-audit-2021") {
    for (const f of auditFindings?.findings.slice(0, 3) ?? []) {
      basis.push(f.finding);
    }
  }

  const extracted = failureSignals?.signals.filter(
    (s) =>
      (targetKey.includes("complaint") && s.signalType === "complaint_spike") ||
      (targetKey.includes("dialysis") && s.signalType === "missed_dialysis") ||
      (targetKey.includes("performance") && s.signalType === "denial_spike"),
  );
  for (const s of extracted?.slice(0, 2) ?? []) {
    basis.push(`Extracted signal: ${s.summary.slice(0, 120)}`);
  }

  if (basis.length === 0 && auditFindings && auditFindings.findings.length > 0) {
    basis.push("2021 OSA NEMT audit documents systemic broker underperformance — live reports needed.");
  }

  return basis.slice(0, 6);
}

function buildTarget(
  reportTarget: ReportTarget,
  generatedAt: string,
  templates: RequestTemplatesArtifact | null,
  auditFindings: AuditFindingsArtifact | null,
  kpis: KpiRegistryArtifact | null,
  stress: OperationalStressSignalsArtifact | null,
  failureSignals: ExtractedFailureSignalsArtifact | null,
): LiveOpportunityTarget {
  const scoring = SCORING[reportTarget.targetKey] ?? {
    targetType: "other" as LiveOpportunityTargetType,
    insightValue: reportTarget.expectedInsightValue,
    probabilityOfUsefulSignal: 50,
    acquisitionDifficulty: 40,
    confidence: "low" as LiveOpportunityConfidence,
    whyItMatters: reportTarget.notes?.[0] ?? "Operational report target from acquisition queue.",
    expectedQuestionsAnswered: reportTarget.expectedInsights.map((i) => `What does data show for: ${i}?`),
    expectedFields: reportTarget.expectedInsights,
    expectedOpportunitySignals: reportTarget.expectedInsights,
    nextAction: `Pursue via ${reportTarget.acquisitionMethod.replace(/_/g, " ")}.`,
  };

  const penalty = scoring.acquiredRankPenalty ?? 0;
  const decisionScore =
    scoring.decisionScoreOverride ??
    computeDecisionScore(
      scoring.insightValue,
      scoring.probabilityOfUsefulSignal,
      scoring.acquisitionDifficulty,
      penalty,
    );

  return {
    targetKey: `live:${reportTarget.targetKey}`,
    rank: 0,
    targetName: reportTarget.reportName,
    holder: reportTarget.holder,
    targetType: scoring.targetType,
    sourceReportTargetKey: reportTarget.targetKey,
    acquisitionStatus: mapAcquisitionStatus(reportTarget),
    acquisitionMethod: mapAcquisitionMethod(reportTarget.acquisitionMethod),
    expectedQuestionsAnswered: scoring.expectedQuestionsAnswered,
    expectedFields: scoring.expectedFields,
    expectedOpportunitySignals: scoring.expectedOpportunitySignals,
    evidenceBasis: evidenceForTarget(reportTarget.targetKey, auditFindings, kpis, stress, failureSignals),
    insightValue: scoring.insightValue,
    acquisitionDifficulty: scoring.acquisitionDifficulty,
    probabilityOfUsefulSignal: scoring.probabilityOfUsefulSignal,
    decisionScore,
    confidence: scoring.confidence,
    nextAction: scoring.nextAction,
    whyItMatters: scoring.whyItMatters,
    requestTemplateKey: templateForTarget(reportTarget.targetKey, templates),
    sourceArtifacts: [
      "runtime-data/reporting/report-targets.generated.json",
      "runtime-data/reporting/kpi-registry.generated.json",
      "runtime-data/reporting/audit-findings.generated.json",
      "runtime-data/reporting/extracted-failure-signals.generated.json",
      "runtime-data/reporting/operational-stress-signals.generated.json",
    ],
    generatedAt,
  };
}

export async function buildLiveOpportunityTargets(): Promise<LiveOpportunityTargetsArtifact> {
  const generatedAt = new Date().toISOString();

  const [reportTargets, , templates, kpis, auditFindings, failureSignals, stress] =
    await Promise.all([
      loadJson<ReportTargetsArtifact>(REPORT_TARGETS_ARTIFACT_PATH),
      loadJson(REQUEST_PACKAGES_ARTIFACT_PATH),
      loadJson<RequestTemplatesArtifact>(REQUEST_TEMPLATES_ARTIFACT_PATH),
      loadJson<KpiRegistryArtifact>(KPI_REGISTRY_ARTIFACT_PATH),
      loadJson<AuditFindingsArtifact>(AUDIT_FINDINGS_ARTIFACT_PATH),
      loadJson<ExtractedFailureSignalsArtifact>(EXTRACTED_FAILURE_SIGNALS_ARTIFACT_PATH),
      loadJson<OperationalStressSignalsArtifact>(OPERATIONAL_STRESS_SIGNALS_ARTIFACT_PATH),
    ]);

  if (!reportTargets) {
    throw new Error("report-targets artifact missing — run npm run build:reporting:acquisition");
  }

  let targets: LiveOpportunityTarget[] = reportTargets.targets.map((rt) =>
    buildTarget(rt, generatedAt, templates, auditFindings, kpis, stress, failureSignals),
  );

  targets.sort((a, b) => b.decisionScore - a.decisionScore);
  targets = targets.map((t, i) => ({ ...t, rank: i + 1 }));

  const byAcquisitionMethod: LiveOpportunityTargetsArtifact["summary"]["byAcquisitionMethod"] = {};
  for (const t of targets) {
    byAcquisitionMethod[t.acquisitionMethod] = (byAcquisitionMethod[t.acquisitionMethod] ?? 0) + 1;
  }

  const startHere: StartHereItem[] = [];
  for (let i = 0; i < START_HERE_KEYS.length; i++) {
    const key = START_HERE_KEYS[i];
    const t = targets.find((x) => x.sourceReportTargetKey === key);
    if (!t) continue;
    startHere.push({
      rank: i + 1,
      targetKey: t.targetKey,
      targetName: t.targetName,
      whyItMatters: t.whyItMatters,
      whatItUnlocks: t.expectedOpportunitySignals,
      acquisitionStatus: t.acquisitionStatus,
      requestTemplateKey: t.requestTemplateKey,
      decisionScore: t.decisionScore,
    });
  }

  const artifact: LiveOpportunityTargetsArtifact = {
    generatedAt,
    total: targets.length,
    targets,
    startHere,
    summary: {
      requestReady: targets.filter((t) => t.acquisitionStatus === "request_ready").length,
      acquired: targets.filter((t) => t.acquisitionStatus === "acquired").length,
      extracted: targets.filter((t) => t.acquisitionStatus === "extracted").length,
      highConfidence: targets.filter((t) => t.confidence === "high").length,
      topThree: targets.slice(0, 3).map((t) => t.targetName),
      topDecisionScore: targets[0]?.decisionScore ?? 0,
      byAcquisitionMethod,
    },
  };

  await writeFile(LIVE_OPPORTUNITY_TARGETS_ARTIFACT_PATH, JSON.stringify(artifact, null, 2), "utf8");
  return artifact;
}
