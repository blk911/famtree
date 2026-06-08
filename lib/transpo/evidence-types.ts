// lib/transpo/evidence-types.ts
// County evidence dossier types — known vs inferred vs missing transparency layer.

export type EvidenceStatus = "known" | "inferred" | "missing";

export type EvidenceCategory =
  | "demand"
  | "capacity"
  | "operations"
  | "quality"
  | "broker"
  | "compliance";

export interface EvidenceItem {
  key: string;
  label: string;
  category: EvidenceCategory;
  status: EvidenceStatus;
  value?: string | number | boolean;
  source?: string;
  sourceUrl?: string;
  notes?: string[];
  isOverride?: boolean;
}

export type ResearchPriority = "high" | "medium" | "low";

export interface CountyEvidenceDossier {
  countyKey: string;
  county: string;
  state: string;
  known: EvidenceItem[];
  inferred: EvidenceItem[];
  missing: EvidenceItem[];
  knownCount: number;
  inferredCount: number;
  missingCount: number;
  evidenceCompletenessScore: number;
  researchPriority: ResearchPriority;
  generatedAt: string;
}

export interface CountyEvidenceDossiersArtifact {
  generatedAt: string;
  totalCounties: number;
  dossiers: CountyEvidenceDossier[];
}
