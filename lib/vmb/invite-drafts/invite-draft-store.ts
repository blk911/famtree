import type { InviteDraftStatus, PatchInviteDraftInput, VmbInviteDraft } from "@/types/vmb/invite-draft";
import { appendInviteEvent } from "@/lib/vmb/invites/append-invite-event";
import { buildInviteDraftsForAnalysis } from "@/lib/vmb/invites/build-invite-drafts-for-analysis";
import { resolveVmbStorageBackend } from "@/lib/vmb/db";
import { getVmbBookAnalysisForTrial } from "../book-analysis/analysis-store";
import { getVmbInviteDraftsFile } from "../paths";
import { readJsonArray, writeJsonArray } from "../runtime-json-store";
import { assertVmbWritableBackend, vmbJsonFallbackAllowed, vmbProductionRequiresPostgres } from "../storage-policy";
import {
  getInviteDraftForTrialPostgres,
  listInviteDraftsForTrialAnalysisPostgres,
  listInviteDraftsPostgres,
  normalizeInviteDraft,
  patchInviteDraftForTrialPostgres,
  replaceInviteDraftsForTrialAnalysisPostgres,
} from "./invite-draft-store-postgres";
import { INVITE_DRAFT_POSTGRES_REQUIRED } from "./invite-draft-storage-errors";

export { INVITE_DRAFT_POSTGRES_REQUIRED } from "./invite-draft-storage-errors";

function recordInviteSentIfNeeded(
  trialId: string,
  previous: VmbInviteDraft,
  next: VmbInviteDraft,
): void {
  if (next.status !== "sent" || previous.status === "sent") return;
  void appendInviteEvent({
    eventType: "invite_sent",
    salonId: trialId,
    payload: {
      draftId: next.draftId,
      clientName: next.clientName,
      inviteCategory: next.inviteCategory,
      analysisId: next.analysisId,
    },
  });
}

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

async function assertInviteDraftWritable(): Promise<
  { ok: true; backend: "postgres" | "json" } | { error: string }
> {
  const writable = await assertVmbWritableBackend();
  if (!writable.ok) {
    if (vmbProductionRequiresPostgres()) {
      return { error: INVITE_DRAFT_POSTGRES_REQUIRED };
    }
    return { error: writable.error };
  }
  return { ok: true, backend: writable.backend };
}

async function listInviteDraftsJson(): Promise<VmbInviteDraft[]> {
  const all = await readJsonArray(getVmbInviteDraftsFile(), isInviteDraft);
  return all.map(normalizeInviteDraft);
}

export async function listInviteDrafts(): Promise<VmbInviteDraft[]> {
  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    return listInviteDraftsPostgres();
  }
  return listInviteDraftsJson();
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
  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    return listInviteDraftsForTrialAnalysisPostgres(trialId, analysisId);
  }
  return listInviteDraftsForTrial(trialId, analysisId);
}

export async function getInviteDraftForTrial(
  draftId: string,
  trialId: string,
): Promise<VmbInviteDraft | undefined> {
  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    return getInviteDraftForTrialPostgres(draftId, trialId);
  }
  const all = await listInviteDraftsJson();
  const draft = all.find((d) => d.draftId === draftId);
  if (!draft || draft.trialId !== trialId) return undefined;
  return draft;
}

/** Recipient landing lookup — draft id is unique within invite draft storage. */
export async function findInviteDraftByIdGlobal(draftId: string): Promise<VmbInviteDraft | undefined> {
  const trimmed = draftId.trim();
  if (!trimmed) return undefined;
  const backend = await resolveVmbStorageBackend();
  if (backend === "postgres") {
    const { findInviteDraftByIdGlobalPostgres } = await import("./invite-draft-store-postgres");
    const row = await findInviteDraftByIdGlobalPostgres(trimmed);
    if (row || !vmbJsonFallbackAllowed()) return row;
  }
  const all = await listInviteDraftsJson();
  return all.find((d) => d.draftId === trimmed);
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

function dedupeInviteDraftsById(drafts: VmbInviteDraft[]): VmbInviteDraft[] {
  const byId = new Map<string, VmbInviteDraft>();
  for (const draft of drafts) {
    byId.set(draft.draftId, draft);
  }
  return Array.from(byId.values());
}

async function persistInviteDraftsForTrialAnalysis(
  trialId: string,
  analysisId: string,
  merged: VmbInviteDraft[],
): Promise<{ ok: true } | { error: string }> {
  const writable = await assertInviteDraftWritable();
  if ("error" in writable) return { error: writable.error };

  if (writable.backend === "postgres") {
    const saved = await replaceInviteDraftsForTrialAnalysisPostgres(trialId, analysisId, merged);
    if ("error" in saved) {
      return vmbProductionRequiresPostgres()
        ? { error: INVITE_DRAFT_POSTGRES_REQUIRED }
        : saved;
    }
    if (vmbJsonFallbackAllowed()) {
      const all = await listInviteDraftsJson();
      const others = all.filter(
        (d) => !(d.trialId === trialId && d.analysisId === analysisId),
      );
      await writeJsonArray(getVmbInviteDraftsFile(), [...merged, ...others]);
    }
    return { ok: true };
  }

  const all = await listInviteDraftsJson();
  const others = all.filter(
    (d) => !(d.trialId === trialId && d.analysisId === analysisId),
  );
  const err = await writeJsonArray(getVmbInviteDraftsFile(), [...merged, ...others]);
  if (err) {
    return vmbProductionRequiresPostgres() ? { error: INVITE_DRAFT_POSTGRES_REQUIRED } : { error: err };
  }
  return { ok: true };
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
  const merged = dedupeInviteDraftsById(mergePreservingEdits(built, existing));

  const persisted = await persistInviteDraftsForTrialAnalysis(trialId, analysis.analysisId, merged);
  if ("error" in persisted) return persisted;

  const existingIds = new Set(existing.map((draft) => draft.draftId));
  for (const draft of merged) {
    if (existingIds.has(draft.draftId)) continue;
    void appendInviteEvent({
      eventType: "invite_created",
      salonId: trialId,
      payload: {
        draftId: draft.draftId,
        clientName: draft.clientName,
        inviteCategory: draft.inviteCategory,
        analysisId: draft.analysisId,
      },
    });
  }

  const stored = await listInviteDraftsForTrialAnalysis(trialId, analysis.analysisId);
  return { drafts: stored };
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

  const built = dedupeInviteDraftsById(buildInviteDraftsForAnalysis(analysis, trialId));
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
  const writable = await assertInviteDraftWritable();
  if ("error" in writable) return writable;

  const current = await getInviteDraftForTrial(draftId, trialId);
  if (!current) return { error: "Draft not found" };

  const next: VmbInviteDraft = {
    ...current,
    status: patch.status ?? current.status,
    editableMessage:
      patch.editableMessage !== undefined ? patch.editableMessage : current.editableMessage,
    updatedAt: new Date().toISOString(),
  };

  if (writable.backend === "postgres") {
    const updated = await patchInviteDraftForTrialPostgres(draftId, trialId, next);
    if ("error" in updated) {
      return vmbProductionRequiresPostgres()
        ? { error: INVITE_DRAFT_POSTGRES_REQUIRED }
        : updated;
    }
    if (vmbJsonFallbackAllowed()) {
      const all = await listInviteDraftsJson();
      const index = all.findIndex((d) => d.draftId === draftId && d.trialId === trialId);
      if (index >= 0) {
        all[index] = updated.draft;
        await writeJsonArray(getVmbInviteDraftsFile(), all);
      }
    }
    recordInviteSentIfNeeded(trialId, current, updated.draft);
    return updated;
  }

  const all = await listInviteDraftsJson();
  const index = all.findIndex((d) => d.draftId === draftId && d.trialId === trialId);
  if (index < 0) return { error: "Draft not found" };
  all[index] = next;
  const err = await writeJsonArray(getVmbInviteDraftsFile(), all);
  if (err) {
    return vmbProductionRequiresPostgres() ? { error: INVITE_DRAFT_POSTGRES_REQUIRED } : { error: err };
  }
  recordInviteSentIfNeeded(trialId, current, next);
  return { draft: next };
}
