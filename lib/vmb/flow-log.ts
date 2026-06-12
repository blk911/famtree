export type VmbFlowStage =
  | "upload saved"
  | "ggen converted"
  | "analysis written"
  | "workspace updated"
  | "active pointer written"
  | "today loader resolved";

export type VmbFlowLogPayload = {
  workspaceId?: string;
  salonId?: string;
  trialId?: string;
  analysisId?: string;
  recordCount?: number;
  clientCount?: number;
  [key: string]: unknown;
};

export function logVmbFlow(stage: VmbFlowStage, payload: VmbFlowLogPayload): void {
  const base = {
    workspaceId: payload.workspaceId ?? payload.trialId ?? payload.salonId,
    salonId: payload.salonId ?? payload.trialId,
    trialId: payload.trialId ?? payload.salonId,
    analysisId: payload.analysisId,
    recordCount: payload.recordCount,
    clientCount: payload.clientCount,
  };
  console.log(`[vmb-flow] ${stage}`, { ...base, ...payload });
}
