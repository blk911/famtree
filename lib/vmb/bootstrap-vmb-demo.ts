import { resolveActiveBook } from "@/lib/vmb/active-book-resolver";
import { loadVmbDemoSeedBookText, resolveVmbDemoSeedBookPath } from "@/lib/vmb/demo-seed-book";
import { runVmbBookAnalysis } from "@/lib/vmb/run-book-analysis";
import { createVmbTrialLead } from "@/lib/vmb/trial-store";
import { setLatestAnalysis, upsertWorkspaceForTrial } from "@/lib/vmb/workspace-store";

export type BootstrapVmbDemoResult =
  | {
      ok: true;
      trialId: string;
      analysisId: string;
      clientCount: number;
      seedPath?: string;
      redirectTo: string;
    }
  | { ok: false; error: string };

/** Fresh demo trial + real book analysis (public-safe, no fake analysis). */
export async function bootstrapVmbDemoSession(): Promise<BootstrapVmbDemoResult> {
  const stamp = Date.now();
  const trialResult = await createVmbTrialLead({
    salonName: "Blue Mountain Salon",
    ownerName: "Jenny",
    email: `vmb-demo-${stamp}@demo.amihuman.net`,
    providerPlatform: "glossgenius",
  });
  if ("error" in trialResult) {
    return { ok: false, error: trialResult.error };
  }

  const trialId = trialResult.lead.id;
  const salonName = trialResult.lead.salonName;

  const workspaceResult = await upsertWorkspaceForTrial({
    trialId,
    salonName,
    ownerName: trialResult.lead.ownerName,
    email: trialResult.lead.email,
    providerPlatform: "glossgenius",
  });
  if ("error" in workspaceResult) {
    return { ok: false, error: workspaceResult.error };
  }

  const seedPath = await resolveVmbDemoSeedBookPath();
  const rawText = await loadVmbDemoSeedBookText();
  const outcome = await runVmbBookAnalysis({
    trialId,
    salonName,
    providerPlatform: "glossgenius",
    rawText,
    sourceType: "sample",
    fileName: "book.csv",
  });
  if (!outcome.ok) {
    return { ok: false, error: outcome.error };
  }

  await upsertWorkspaceForTrial({
    trialId,
    salonName,
    providerPlatform: "glossgenius",
  });
  const workspaceUpdate = await setLatestAnalysis(trialId, outcome.data.analysis.analysisId);
  if ("error" in workspaceUpdate) {
    return { ok: false, error: workspaceUpdate.error };
  }

  const resolved = await resolveActiveBook(trialId, {});
  if (!resolved.hasActiveBook || !resolved.analysisId) {
    return { ok: false, error: "Active book not set after demo bootstrap" };
  }

  return {
    ok: true,
    trialId,
    analysisId: resolved.analysisId,
    clientCount: outcome.data.parse.parsedRecordCount,
    seedPath,
    redirectTo: buildVmbTodayHref(resolved.analysisId),
  };
}

export function buildVmbTodayHref(analysisId: string): string {
  return `/vmb/today?analysis=${encodeURIComponent(analysisId)}`;
}
