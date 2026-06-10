import type { PatchInviteDraftInput, VmbInviteDraft } from "@/types/vmb/invite-draft";
import { getVmbBookAnalysisForTrial } from "../book-analysis/analysis-store";
import { getVmbInviteDraftsFile } from "../paths";
import { readJsonArray, writeJsonArray } from "../runtime-json-store";
import { buildInviteDraftRecords } from "./build-invite-drafts";

function isInviteDraft(item: unknown): item is VmbInviteDraft {
  return (
    !!item &&
    typeof item === "object" &&
    typeof (item as VmbInviteDraft).draftId === "string" &&
    typeof (item as VmbInviteDraft).trialId === "string"
  );
}

export async function listInviteDrafts(): Promise<VmbInviteDraft[]> {
  return readJsonArray(getVmbInviteDraftsFile(), isInviteDraft);
}

export async function listInviteDraftsForTrialAnalysis(
  trialId: string,
  analysisId: string,
): Promise<VmbInviteDraft[]> {
  const all = await listInviteDrafts();
  return all.filter((d) => d.trialId === trialId && d.analysisId === analysisId);
}

export async function getInviteDraftForTrial(
  draftId: string,
  trialId: string,
): Promise<VmbInviteDraft | undefined> {
  const all = await listInviteDrafts();
  const draft = all.find((d) => d.draftId === draftId);
  if (!draft || draft.trialId !== trialId) return undefined;
  return draft;
}

export async function buildInviteDraftsForTrial(
  trialId: string,
  analysisId: string,
): Promise<{ drafts: VmbInviteDraft[] } | { error: string }> {
  const analysis = await getVmbBookAnalysisForTrial(analysisId, trialId);
  if (!analysis) {
    return { error: "Analysis not available for this trial" };
  }

  const existing = await listInviteDraftsForTrialAnalysis(trialId, analysisId);
  if (existing.length > 0) {
    return { drafts: existing };
  }

  const created = buildInviteDraftRecords(analysis, trialId);
  const all = await listInviteDrafts();
  const merged = [...created, ...all.filter((d) => !(d.trialId === trialId && d.analysisId === analysisId))];
  const err = await writeJsonArray(getVmbInviteDraftsFile(), merged);
  if (err) return { error: err };
  return { drafts: created };
}

export async function patchInviteDraftForTrial(
  draftId: string,
  trialId: string,
  patch: PatchInviteDraftInput,
): Promise<{ draft: VmbInviteDraft } | { error: string }> {
  const all = await listInviteDrafts();
  const index = all.findIndex((d) => d.draftId === draftId && d.trialId === trialId);
  if (index < 0) return { error: "Draft not found" };

  const current = all[index];
  const next: VmbInviteDraft = {
    ...current,
    status: patch.status ?? current.status,
    editableMessage:
      patch.editableMessage !== undefined ? patch.editableMessage : current.editableMessage,
    updatedAt: new Date().toISOString(),
  };

  all[index] = next;
  const err = await writeJsonArray(getVmbInviteDraftsFile(), all);
  if (err) return { error: err };
  return { draft: next };
}
