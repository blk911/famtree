// lib/intelligence/core/prospect-types.ts
// Shared prospect types across all intelligence verticals.

export type BaseProspectStatus = "new" | "qualified" | "disqualified" | "contacted" | "archive";

export interface BaseProspect {
  prospectId: string;
  verticalKey: string;
  entityLabel: string;      // "Operator", "Carrier", "Practice"
  prospectLabel: string;    // "Prospect", "Red Dot", "Opportunity"
  name?: string;
  handle?: string;
  location?: string;
  status: BaseProspectStatus;
  opportunityScore?: number;
  notes?: string;
  sourceRunId?: string;
  createdAt: string;
  updatedAt: string;
}
