// lib/intelligence/reporting/reporting-types.ts
// Required reporting, KPI, and audit repositories for transportation intelligence.

export type ReportFrequency = "monthly" | "quarterly" | "annual" | "ad_hoc" | "unknown";

export type ReportPublicAccess = "public" | "open_records" | "contract_only" | "unknown";

export type ReportingConfidence = "high" | "medium" | "low";

export type ReportDiscoveryStatus = "discovered" | "reporting_unknown";

export interface RequiredReport {
  reportKey: string;
  entityName: string;
  ownershipKey?: string;
  reportName: string;
  frequency: ReportFrequency;
  reportOwner: string;
  sourceUrl: string;
  publicAccess: ReportPublicAccess;
  confidence: ReportingConfidence;
  status: ReportDiscoveryStatus;
  notes?: string[];
}

export type KpiCategory =
  | "scheduling"
  | "dispatch"
  | "complaints"
  | "completion"
  | "timeliness"
  | "access"
  | "provider_network"
  | "quality"
  | "other";

export interface KpiDefinition {
  kpiKey: string;
  entityName: string;
  ownershipKey?: string;
  category: KpiCategory;
  kpiName: string;
  targetValue?: string;
  sourceUrl: string;
  confidence: ReportingConfidence;
  notes?: string[];
}

export type AuditSeverity = "low" | "medium" | "high" | "critical" | "unknown";

export interface AuditFinding {
  findingKey: string;
  entityName: string;
  ownershipKey?: string;
  auditName: string;
  auditDate?: string;
  severity: AuditSeverity;
  finding: string;
  correctiveAction?: string;
  sourceUrl: string;
  confidence: ReportingConfidence;
  notes?: string[];
}

export type OperationalStressSignalType =
  | "audit_failure"
  | "missed_kpi"
  | "corrective_action"
  | "complaint_pattern"
  | "provider_adequacy_issue"
  | "reporting_gap"
  | "unknown";

export interface OperationalStressSignal {
  signalKey: string;
  entityName: string;
  ownershipKey?: string;
  signalType: OperationalStressSignalType;
  severity: AuditSeverity;
  summary: string;
  sourceUrl: string;
  confidence: ReportingConfidence;
}

export interface ClosestPathToFailureMetric {
  rank: number;
  entityName: string;
  ownershipKey?: string;
  metricSource: string;
  rationale: string;
  failureSignals: string[];
  sourceUrl: string;
  confidence: ReportingConfidence;
}

export interface RequiredReportsArtifact {
  generatedAt: string;
  total: number;
  discovered: number;
  reportingUnknown: number;
  reports: RequiredReport[];
}

export interface KpiRegistryArtifact {
  generatedAt: string;
  total: number;
  byCategory: Partial<Record<KpiCategory, number>>;
  kpis: KpiDefinition[];
}

export interface AuditFindingsArtifact {
  generatedAt: string;
  total: number;
  findings: AuditFinding[];
}

export interface OperationalStressSignalsArtifact {
  generatedAt: string;
  total: number;
  signals: OperationalStressSignal[];
  closestPathToFailureMetrics: ClosestPathToFailureMetric[];
  summary: {
    topReportingEntities: { entityName: string; ownershipKey?: string; score: number }[];
  };
}

export interface ReportingRegistryBundle {
  requiredReports: RequiredReportsArtifact;
  kpiRegistry: KpiRegistryArtifact;
  auditFindings: AuditFindingsArtifact;
  stressSignals: OperationalStressSignalsArtifact;
}
