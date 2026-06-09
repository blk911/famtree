// lib/intelligence/reporting/target-types.ts
// Prioritized acquisition queue for operational reports.

export type ReportTargetCategory =
  | "performance_report"
  | "dialysis_report"
  | "complaint_summary"
  | "corrective_action"
  | "provider_adequacy"
  | "audit"
  | "contract_attachment";

export type TargetAcquisitionMethod =
  | "public_download"
  | "contract_request"
  | "state_records_request"
  | "cora"
  | "foia"
  | "unknown";

export type ReportTargetStatus =
  | "identified"
  | "request_ready"
  | "requested"
  | "acquired"
  | "failed";

export type AcquisitionWorkflowStage =
  | "identified"
  | "request_ready"
  | "requested"
  | "acquired"
  | "extracted"
  | "signals_generated"
  | "failed";

export interface ReportTarget {
  targetKey: string;
  sourceKey?: string;
  reportName: string;
  holder: string;
  reportCategory: ReportTargetCategory;
  priority: number;
  expectedInsightValue: number;
  expectedInsights: string[];
  acquisitionMethod: TargetAcquisitionMethod;
  status: ReportTargetStatus;
  workflowStage: AcquisitionWorkflowStage;
  sourceUrl?: string;
  notes?: string[];
}

export interface ReportTargetsArtifact {
  generatedAt: string;
  total: number;
  summary: {
    identified: number;
    requestReady: number;
    requested: number;
    acquired: number;
    failed: number;
  };
  targets: ReportTarget[];
}

export interface RequestPackage {
  packageKey: string;
  targetKey: string;
  reportName: string;
  holder: string;
  requestPath: string;
  suggestedRequestType: TargetAcquisitionMethod;
  expectedOutput: string[];
  priority: number;
  notes?: string[];
}

export interface RequestPackagesArtifact {
  generatedAt: string;
  total: number;
  packages: RequestPackage[];
}

export interface RequestTemplate {
  templateKey: string;
  targetKeys: string[];
  subject: string;
  agency: string;
  requestedDocuments: string[];
  dateRange: string;
  expectedReportNames: string[];
  body: string;
}

export interface RequestTemplatesArtifact {
  generatedAt: string;
  total: number;
  templates: RequestTemplate[];
}

export interface ReportTargetStateFile {
  version: number;
  targets: Record<
    string,
    {
      status: ReportTargetStatus;
      updatedAt: string;
      notes?: string;
    }
  >;
}
