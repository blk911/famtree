// lib/intelligence/salon/pipeline/pipeline-types.ts

export type SalonPipelineStageId =
  | "discover"
  | "enrich"
  | "verify"
  | "qualify"
  | "operate";

export type SalonPipelineStageCounts = Record<SalonPipelineStageId, number>;

export interface SalonPipelineSummary extends SalonPipelineStageCounts {
  /** Total salon prospect records in store */
  totalOperators: number;
  /** ISO timestamp */
  updatedAt: string;
  /** Short notes on how each count was derived (admin/debug) */
  countNotes: Record<SalonPipelineStageId, string>;
}

export interface SalonPipelineStageDef {
  id: SalonPipelineStageId;
  order: number;
  label: string;
  description: string;
  purpose: string;
  navItemIds: string[];
  primaryHref: string;
  primaryActionLabel: string;
}
