import type { SalonBackOfficeImportRun } from "@/lib/intelligence/salon/backoffice/types";
import { logVmbFlow } from "@/lib/vmb/flow-log";
import {
  countGgenNormalized,
  ggenNormalizedToVmbBookRecords,
} from "@/lib/vmb/ggen-to-book-records";
import { runVmbBookAnalysisFromRecords } from "@/lib/vmb/run-book-analysis";
import { setLatestAnalysis, upsertWorkspaceForTrial } from "@/lib/vmb/workspace-store";
import type { VmbProviderPlatform } from "@/types/vmb/trial";

export type GgenBridgeInput = {
  trialId: string;
  salonName?: string;
  providerPlatform?: VmbProviderPlatform;
  importRun: SalonBackOfficeImportRun;
};

export type GgenBridgeResult =
  | { ok: true; analysisId: string; recordCount: number; clientCount: number }
  | { ok: false; reason: string };

/**
 * Hand off GGEN converted rows into the same Find The Money analysis/workspace chain.
 */
export async function bridgeGgenImportToVmbAnalysis(
  input: GgenBridgeInput,
): Promise<GgenBridgeResult> {
  const trialId = input.trialId.trim();
  if (!trialId) return { ok: false, reason: "trialId required" };

  const counts = countGgenNormalized(input.importRun.normalizedPreview);
  logVmbFlow("ggen converted", {
    trialId,
    salonId: trialId,
    workspaceId: trialId,
    sourceUploadId: input.importRun.id,
    ...counts,
    fileName: input.importRun.fileName,
  });

  const records = ggenNormalizedToVmbBookRecords(input.importRun.normalizedPreview);
  if (records.length === 0) {
    return { ok: false, reason: "GGEN conversion produced zero VMB book records" };
  }

  const platform =
    input.providerPlatform ??
    (input.importRun.provider === "glossgenius" ? "glossgenius" : undefined);

  await upsertWorkspaceForTrial({
    trialId,
    salonName: input.salonName ?? "Your Salon",
    providerPlatform: platform,
  });

  const outcome = await runVmbBookAnalysisFromRecords({
    trialId,
    salonName: input.salonName,
    providerPlatform: platform,
    records,
    sourceType: "csv_upload",
    fileName: input.importRun.fileName,
    sourceUploadId: input.importRun.id,
  });

  if (!outcome.ok) {
    return { ok: false, reason: outcome.error };
  }

  const analysis = outcome.data.analysis;
  const workspaceUpdate = await setLatestAnalysis(trialId, analysis.analysisId);
  if ("error" in workspaceUpdate) {
    return { ok: false, reason: workspaceUpdate.error };
  }

  const clientCount = new Set(records.map((r) => r.clientName.toLowerCase())).size;
  return {
    ok: true,
    analysisId: analysis.analysisId,
    recordCount: analysis.recordCount,
    clientCount,
  };
}
