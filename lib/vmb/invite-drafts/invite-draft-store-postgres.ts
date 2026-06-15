import type { VmbInviteDraft } from "@/types/vmb/invite-draft";
import { prisma, resolveVmbStorageBackend } from "@/lib/vmb/db";

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

function parsePayload(raw: unknown): VmbInviteDraft | undefined {
  if (!raw) return undefined;
  if (typeof raw === "string") {
    try {
      return parsePayload(JSON.parse(raw) as unknown);
    } catch {
      return undefined;
    }
  }
  return isInviteDraft(raw) ? raw : undefined;
}

export function normalizeInviteDraft(item: VmbInviteDraft): VmbInviteDraft {
  const category =
    item.inviteCategory ??
    (item.inviteType === "private_client_network" ? "private_client_network" : "private_client_network");
  return {
    ...item,
    inviteCategory: category,
    inviteType: category === "private_client_network" ? "private_client_network" : item.inviteType,
  };
}

type DraftRow = { payload: unknown };

export async function listInviteDraftsPostgres(): Promise<VmbInviteDraft[]> {
  if ((await resolveVmbStorageBackend()) !== "postgres") return [];

  try {
    const rows = await prisma.$queryRaw<DraftRow[]>`
      SELECT payload FROM vmb_invite_draft ORDER BY updated_at DESC
    `;
    return rows.map((row) => parsePayload(row.payload)).filter((d): d is VmbInviteDraft => !!d).map(normalizeInviteDraft);
  } catch {
    return [];
  }
}

export async function listInviteDraftsForTrialAnalysisPostgres(
  trialId: string,
  analysisId: string,
): Promise<VmbInviteDraft[]> {
  if ((await resolveVmbStorageBackend()) !== "postgres") return [];

  try {
    const rows = await prisma.$queryRaw<DraftRow[]>`
      SELECT payload FROM vmb_invite_draft
      WHERE trial_id = ${trialId.trim()} AND analysis_id = ${analysisId.trim()}
      ORDER BY updated_at DESC
    `;
    return rows.map((row) => parsePayload(row.payload)).filter((d): d is VmbInviteDraft => !!d).map(normalizeInviteDraft);
  } catch {
    return [];
  }
}

export async function getInviteDraftForTrialPostgres(
  draftId: string,
  trialId: string,
): Promise<VmbInviteDraft | undefined> {
  if ((await resolveVmbStorageBackend()) !== "postgres") return undefined;

  try {
    const rows = await prisma.$queryRaw<DraftRow[]>`
      SELECT payload FROM vmb_invite_draft
      WHERE draft_id = ${draftId.trim()} AND trial_id = ${trialId.trim()}
      LIMIT 1
    `;
    const draft = parsePayload(rows[0]?.payload);
    return draft ? normalizeInviteDraft(draft) : undefined;
  } catch {
    return undefined;
  }
}

export async function findInviteDraftByIdGlobalPostgres(
  draftId: string,
): Promise<VmbInviteDraft | undefined> {
  if ((await resolveVmbStorageBackend()) !== "postgres") return undefined;

  try {
    const rows = await prisma.$queryRaw<DraftRow[]>`
      SELECT payload FROM vmb_invite_draft
      WHERE draft_id = ${draftId.trim()}
      LIMIT 1
    `;
    const draft = parsePayload(rows[0]?.payload);
    return draft ? normalizeInviteDraft(draft) : undefined;
  } catch {
    return undefined;
  }
}

export async function replaceInviteDraftsForTrialAnalysisPostgres(
  trialId: string,
  analysisId: string,
  drafts: VmbInviteDraft[],
): Promise<{ ok: true } | { error: string }> {
  try {
    const backend = await resolveVmbStorageBackend();
    if (backend !== "postgres") return { error: "Postgres backend unavailable" };

    const trimmedTrial = trialId.trim();
    const trimmedAnalysis = analysisId.trim();

    await prisma.$executeRaw`
      DELETE FROM vmb_invite_draft
      WHERE trial_id = ${trimmedTrial} AND analysis_id = ${trimmedAnalysis}
    `;

    for (const draft of drafts) {
      const normalized = normalizeInviteDraft(draft);
      await prisma.$executeRaw`
        INSERT INTO vmb_invite_draft (draft_id, trial_id, analysis_id, payload, updated_at)
        VALUES (
          ${normalized.draftId},
          ${trimmedTrial},
          ${trimmedAnalysis},
          ${JSON.stringify(normalized)}::jsonb,
          now()
        )
        ON CONFLICT (draft_id) DO UPDATE SET
          trial_id = EXCLUDED.trial_id,
          analysis_id = EXCLUDED.analysis_id,
          payload = EXCLUDED.payload,
          updated_at = now()
      `;
    }

    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function patchInviteDraftForTrialPostgres(
  draftId: string,
  trialId: string,
  next: VmbInviteDraft,
): Promise<{ draft: VmbInviteDraft } | { error: string }> {
  try {
    const backend = await resolveVmbStorageBackend();
    if (backend !== "postgres") return { error: "Postgres backend unavailable" };

    const normalized = normalizeInviteDraft(next);
    await prisma.$executeRaw`
      INSERT INTO vmb_invite_draft (draft_id, trial_id, analysis_id, payload, updated_at)
      VALUES (
        ${normalized.draftId},
        ${trialId.trim()},
        ${normalized.analysisId},
        ${JSON.stringify(normalized)}::jsonb,
        now()
      )
      ON CONFLICT (draft_id) DO UPDATE SET
        trial_id = EXCLUDED.trial_id,
        analysis_id = EXCLUDED.analysis_id,
        payload = EXCLUDED.payload,
        updated_at = now()
    `;

    return { draft: normalized };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteInviteDraftsForTrialPostgres(trialId: string): Promise<void> {
  if ((await resolveVmbStorageBackend()) !== "postgres") return;
  try {
    await prisma.$executeRaw`
      DELETE FROM vmb_invite_draft WHERE trial_id = ${trialId.trim()}
    `;
  } catch {
    // test cleanup best-effort
  }
}
