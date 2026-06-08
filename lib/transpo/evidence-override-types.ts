// lib/transpo/evidence-override-types.ts

import type { EvidenceStatus } from "./evidence-types";

export interface EvidenceOverride {
  overrideId: string;
  countyKey: string;
  county: string;
  state: string;
  evidenceKey: string;
  status: EvidenceStatus;
  value?: string | number | boolean;
  source?: string;
  sourceUrl?: string;
  notes?: string[];
  createdFromTaskId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceOverridesFile {
  overrides: EvidenceOverride[];
}
