// lib/intelligence/reporting/live-opportunity-types.ts
// Ranked decision surface for live operational document targets.

export type LiveOpportunityTargetType =
  | "report"
  | "complaint_records"
  | "audit"
  | "contract_kpi"
  | "corrective_action"
  | "provider_adequacy"
  | "other";

export type LiveOpportunityAcquisitionStatus =
  | "identified"
  | "request_ready"
  | "requested"
  | "acquired"
  | "extracted"
  | "failed";

export type LiveOpportunityAcquisitionMethod =
  | "public_download"
  | "cora"
  | "state_records_request"
  | "contract_request"
  | "foia"
  | "unknown";

export type LiveOpportunityConfidence = "low" | "medium" | "high";

export interface LiveOpportunityTarget {
  targetKey: string;
  rank: number;
  targetName: string;
  holder: string;
  targetType: LiveOpportunityTargetType;
  sourceReportTargetKey?: string;
  acquisitionStatus: LiveOpportunityAcquisitionStatus;
  acquisitionMethod: LiveOpportunityAcquisitionMethod;
  expectedQuestionsAnswered: string[];
  expectedFields: string[];
  expectedOpportunitySignals: string[];
  evidenceBasis: string[];
  insightValue: number;
  acquisitionDifficulty: number;
  probabilityOfUsefulSignal: number;
  decisionScore: number;
  confidence: LiveOpportunityConfidence;
  nextAction: string;
  whyItMatters: string;
  requestTemplateKey?: string;
  sourceArtifacts: string[];
  generatedAt: string;
}

export interface LiveOpportunityTargetsArtifact {
  generatedAt: string;
  total: number;
  targets: LiveOpportunityTarget[];
  summary: {
    requestReady: number;
    acquired: number;
    extracted: number;
    highConfidence: number;
    topThree: string[];
    topDecisionScore: number;
    byAcquisitionMethod: Partial<Record<LiveOpportunityAcquisitionMethod, number>>;
  };
  startHere: StartHereItem[];
}

export interface StartHereItem {
  rank: number;
  targetKey: string;
  targetName: string;
  whyItMatters: string;
  whatItUnlocks: string[];
  acquisitionStatus: LiveOpportunityAcquisitionStatus;
  requestTemplateKey?: string;
  decisionScore: number;
}
