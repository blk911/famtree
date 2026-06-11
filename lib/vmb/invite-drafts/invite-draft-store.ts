import type { InviteDraftStatus, PatchInviteDraftInput, VmbInviteDraft } from "@/types/vmb/invite-draft";
import { buildInviteDraftsForAnalysis } from "@/lib/vmb/invites/build-invite-drafts-for-analysis";
import { getVmbBookAnalysisForTrial } from "../book-analysis/analysis-store";
import { getVmbInviteDraftsFile } from "../paths";
import { readJsonArray, writeJsonArray } from "../runtime-json-store";

function isInviteDraft(item: unknown): item is VmbInviteDraft {
  if (!item || typeof item !== "object") return false;
  const d = item as VmbInviteDraft;
  return (
    typeof d.draftId === "string" &&
    typeof d.trialId === "string" &&
    typeof d.analysisId === "string" &&
    typeof d.clientName === "string"
  );
}

function normalizeDraft(item: VmbInviteDraft): VmbInviteDraft {
  const category =
    item.inviteCategory ??
    (item.inviteType === "private_client_network" ? "private_client_network" : "private_client_network");
  return {
    ...item,
    inviteCategory: category,
    inviteType: category === "private_client_network" ? "private_client_network" : item.inviteType,
  };
}

export async function listInviteDrafts(): Promise<VmbInviteDraft[]> {
  const all = await readJsonArray(getVmbInviteDraftsFile(), isInviteDraft);
  return all.map(normalizeDraft);
}

export async function listInviteDraftsForTrial(
  trialId: string,
  analysisId?: string,
): Promise<VmbInviteDraft[]> {
  const all = await listInviteDrafts();
  return all.filter(
    (d) => d.trialId === trialId && (!analysisId || d.analysisId === analysisId),
  );
}

/** @alias listInviteDraftsForTrial */
export async function listInviteDraftsForTrialAnalysis(
  trialId: string,
  analysisId: string,
): Promise<VmbInviteDraft[]> {
  return listInviteDraftsForTrial(trialId, analysisId);
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

function mergePreservingEdits(
  built: VmbInviteDraft[],
  existing: VmbInviteDraft[],
): VmbInviteDraft[] {
  const byId = new Map(existing.map((d) => [d.draftId, d]));
  return built.map((draft) => {
    const prev = byId.get(draft.draftId);
    if (!prev) return draft;
    return {
      ...draft,
      status: prev.status,
      editableMessage: prev.editableMessage,
      subject: prev.subject,
      createdAt: prev.createdAt,
      updatedAt: prev.updatedAt,
    };
  });
}

export async function buildInviteDraftsForAnalysisStore(
  trialId: string,
  analysisId: string,
): Promise<{ drafts: VmbInviteDraft[] } | { error: string }> {
  const analysis = await getVmbBookAnalysisForTrial(analysisId, trialId);
  if (!analysis) {
    return { error: "Analysis not available for this trial" };
  }
  return buildInviteDraftsForTrial(trialId, analysis);
}

export async function buildInviteDraftsForTrial(
  trialId: string,
  analysis: import("@/types/vmb/book-analysis").VmbBookAnalysisResult,
): Promise<{ drafts: VmbInviteDraft[] } | { error: string }> {
  if (analysis.trialId && analysis.trialId !== trialId) {
    return { error: "Analysis not available for this trial" };
  }

  const built = buildInviteDraftsForAnalysis(analysis, trialId);
  const existing = await listInviteDraftsForTrialAnalysis(trialId, analysis.analysisId);
  const merged = mergePreservingEdits(built, existing);

  const all = await listInviteDrafts();
  const others = all.filter(
    (d) => !(d.trialId === trialId && d.analysisId === analysis.analysisId),
  );
  const err = await writeJsonArray(getVmbInviteDraftsFile(), [...merged, ...others]);
  if (err) return { error: err };
  return { drafts: merged };
}

/** Resolve drafts for analysis — builds if missing, never duplicates stable keys. */
export async function ensureInviteDraftsForAnalysis(
  trialId: string,
  analysisId: string,
): Promise<{ drafts: VmbInviteDraft[] } | { error: string }> {
  const existing = await listInviteDraftsForTrialAnalysis(trialId, analysisId);
  const analysis = await getVmbBookAnalysisForTrial(analysisId, trialId);
  if (!analysis) {
    return { error: "Analysis not available for this trial" };
  }

  const built = buildInviteDraftsForAnalysis(analysis, trialId);
  const hasAllCategories =
    existing.length >= built.length &&
    built.every((b) => existing.some((e) => e.draftId === b.draftId));

  if (hasAllCategories && existing.length > 0) {
    return { drafts: existing };
  }

  return buildInviteDraftsForTrial(trialId, analysis);
}

export async function updateInviteDraftStatus(
  draftId: string,
  trialId: string,
  status: InviteDraftStatus,
): Promise<{ draft: VmbInviteDraft } | { error: string }> {
  return patchInviteDraftForTrial(draftId, trialId, { status });
}

export async function updateInviteDraftMessage(
  draftId: string,
  trialId: string,
  editableMessage: string,
): Promise<{ draft: VmbInviteDraft } | { error: string }> {
  return patchInviteDraftForTrial(draftId, trialId, { editableMessage });
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
