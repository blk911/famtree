// lib/intelligence/core/types.ts
// Shared base types across all intelligence verticals.

export type VerticalKey = "salon" | "transpo" | "hcare" | "labs";

export interface IntelligenceEntity {
  id: string;
  verticalKey: VerticalKey;
  name: string;
  handle?: string;
  location?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourceRun {
  runId: string;
  verticalKey: VerticalKey;
  sourceType: string;
  market: string;
  notes?: string;
  createdAt: string;
  status: "pending" | "running" | "complete" | "failed";
  recordCount: number;
}
