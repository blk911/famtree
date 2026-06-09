// lib/intelligence/reporting/acquisition-types.ts
// Report acquisition, extraction, and failure signal types.

export type ReportType =
  | "performance_report"
  | "dialysis_report"
  | "complaint_report"
  | "audit"
  | "corrective_action"
  | "contract_attachment"
  | "other";

export type AcquisitionMethod =
  | "public_download"
  | "state_records_request"
  | "foia"
  | "contract_request"
  | "website"
  | "unknown";

export type AcquisitionStatus =
  | "not_started"
  | "discovered"
  | "requested"
  | "acquired"
  | "failed";

export interface ReportSource {
  sourceKey: string;
  entityName: string;
  reportName: string;
  reportType: ReportType;
  acquisitionMethod: AcquisitionMethod;
  publicAvailable: boolean;
  acquisitionStatus: AcquisitionStatus;
  sourceUrl?: string;
  reportKey?: string;
  ownershipKey?: string;
  insightValue: number;
  notes?: string[];
}

export interface AcquiredReport {
  reportId: string;
  sourceKey: string;
  reportName: string;
  entityName: string;
  acquisitionDate: string;
  localPath?: string;
  fileType?: string;
  sourceUrl?: string;
  extracted: boolean;
}

export type ExtractedMetricCategory =
  | "complaints"
  | "denials"
  | "dialysis"
  | "completion"
  | "timeliness"
  | "provider_network"
  | "call_center"
  | "other";

export interface ExtractedMetric {
  metricKey: string;
  reportId: string;
  entityName: string;
  metricName: string;
  metricValue: string;
  category: ExtractedMetricCategory;
  sourcePage?: string;
  sourceUrl?: string;
}

export type FailureSignalSeverity = "low" | "medium" | "high" | "critical";

export type FailureSignalType =
  | "denial_spike"
  | "complaint_spike"
  | "missed_dialysis"
  | "provider_shortage"
  | "missed_kpi"
  | "corrective_action"
  | "other";

export interface FailureSignal {
  signalKey: string;
  reportId: string;
  entityName: string;
  severity: FailureSignalSeverity;
  signalType: FailureSignalType;
  summary: string;
  sourceUrl?: string;
  appliesToCounties?: string[];
}

export interface ReportSourcesArtifact {
  generatedAt: string;
  total: number;
  sources: ReportSource[];
}

export interface ReportAcquisitionArtifact {
  generatedAt: string;
  summary: {
    discovered: number;
    requested: number;
    acquired: number;
    failed: number;
    notStarted: number;
  };
  sources: ReportSource[];
  acquiredReports: AcquiredReport[];
}

export interface ExtractedMetricsArtifact {
  generatedAt: string;
  total: number;
  metrics: ExtractedMetric[];
}

export interface ExtractedFailureSignalsArtifact {
  generatedAt: string;
  total: number;
  bySeverity: Partial<Record<FailureSignalSeverity, number>>;
  signals: FailureSignal[];
}

export interface RecordsRequestTarget {
  targetKey: string;
  holder: string;
  reportName: string;
  sourceKey: string;
  requestPath: string;
  accessMethod: AcquisitionMethod;
  priority: number;
  insightValue: number;
  expectedReport: string;
  notes?: string[];
}

export interface RecordsRequestTargetsArtifact {
  generatedAt: string;
  total: number;
  targets: RecordsRequestTarget[];
}

export interface ReportAcquisitionStateFile {
  version: number;
  sources: Record<
    string,
    {
      acquisitionStatus: AcquisitionStatus;
      updatedAt: string;
      notes?: string;
    }
  >;
}
