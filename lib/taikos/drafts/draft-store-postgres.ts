import { parsePayload, prisma, resolveTaikosStorageBackend } from "@/lib/taikos/storage/taikos-db";
import type {
  CreateTaikosDraftInput,
  TaikosDraft,
  TaikosDraftStatus,
  TaikosDraftType,
  UpdateTaikosDraftInput,
} from "@/lib/taikos/drafts/types";
import type { ListDraftsOptions } from "@/lib/taikos/drafts/draft-store";

function isDraft(item: unknown): item is TaikosDraft {
  return (
    !!item &&
    typeof item === "object" &&
    typeof (item as TaikosDraft).draftId === "string" &&
    typeof (item as TaikosDraft).salonId === "string"
  );
}

function rowToDraft(row: { payload: unknown }): TaikosDraft | undefined {
  return parsePayload(row.payload, isDraft);
}

function workspaceFromPage(sourcePage: string): string | null {
  if (sourcePage.includes("invites")) return "invites";
  if (sourcePage.includes("campaign")) return "campaigns";
  if (sourcePage.includes("service")) return "service-cards";
  return null;
}

function bodyFromDraft(draft: TaikosDraft): string | null {
  const message = draft.payload.message;
  return typeof message === "string" ? message : null;
}

export async function listDraftsPostgres(options: ListDraftsOptions): Promise<TaikosDraft[]> {
  if ((await resolveTaikosStorageBackend()) !== "postgres") return [];
  try {
    const limit = options.limit ?? 50;
    let rows: Array<{ payload: unknown }>;

    if (options.status && options.type) {
      rows = await prisma.$queryRaw`
        SELECT payload FROM taikos_draft
        WHERE salon_id = ${options.salonId}
          AND status = ${options.status}
          AND type = ${options.type}
        ORDER BY updated_at DESC
        LIMIT ${limit}
      `;
    } else if (options.status) {
      rows = await prisma.$queryRaw`
        SELECT payload FROM taikos_draft
        WHERE salon_id = ${options.salonId} AND status = ${options.status}
        ORDER BY updated_at DESC
        LIMIT ${limit}
      `;
    } else if (options.type) {
      rows = await prisma.$queryRaw`
        SELECT payload FROM taikos_draft
        WHERE salon_id = ${options.salonId} AND type = ${options.type}
        ORDER BY updated_at DESC
        LIMIT ${limit}
      `;
    } else {
      rows = await prisma.$queryRaw`
        SELECT payload FROM taikos_draft
        WHERE salon_id = ${options.salonId}
        ORDER BY updated_at DESC
        LIMIT ${limit}
      `;
    }

    return rows.map(rowToDraft).filter((d): d is TaikosDraft => !!d);
  } catch {
    return [];
  }
}

export async function getDraftByIdPostgres(
  salonId: string,
  draftId: string,
): Promise<TaikosDraft | null> {
  if ((await resolveTaikosStorageBackend()) !== "postgres") return null;
  try {
    const rows = await prisma.$queryRaw<Array<{ payload: unknown }>>`
      SELECT payload FROM taikos_draft
      WHERE salon_id = ${salonId} AND id = ${draftId}
      LIMIT 1
    `;
    return rowToDraft(rows[0] ?? { payload: null }) ?? null;
  } catch {
    return null;
  }
}

export async function findDraftByIdGlobalPostgres(draftId: string): Promise<TaikosDraft | null> {
  if ((await resolveTaikosStorageBackend()) !== "postgres") return null;
  try {
    const rows = await prisma.$queryRaw<Array<{ payload: unknown }>>`
      SELECT payload FROM taikos_draft
      WHERE id = ${draftId}
      LIMIT 1
    `;
    return rowToDraft(rows[0] ?? { payload: null }) ?? null;
  } catch {
    return null;
  }
}

export async function createDraftPostgres(
  input: CreateTaikosDraftInput,
): Promise<TaikosDraft | { error: string }> {
  if ((await resolveTaikosStorageBackend()) !== "postgres") {
    return { error: "Postgres backend unavailable" };
  }
  try {
    const now = new Date().toISOString();
    const draft: TaikosDraft = {
      ...input,
      draftId: input.draftId ?? `td-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
    };

    await prisma.$executeRaw`
      INSERT INTO taikos_draft (
        id, salon_id, workspace, type, status, title, body, payload, created_at, updated_at
      )
      VALUES (
        ${draft.draftId},
        ${draft.salonId},
        ${workspaceFromPage(draft.sourcePage)},
        ${draft.draftType},
        ${draft.status},
        ${draft.title},
        ${bodyFromDraft(draft)},
        ${JSON.stringify(draft)}::jsonb,
        ${now}::timestamptz,
        ${now}::timestamptz
      )
    `;
    return draft;
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateDraftPostgres(
  salonId: string,
  draftId: string,
  patch: UpdateTaikosDraftInput,
): Promise<TaikosDraft | null | { error: string }> {
  if ((await resolveTaikosStorageBackend()) !== "postgres") {
    return { error: "Postgres backend unavailable" };
  }
  try {
    const current = await getDraftByIdPostgres(salonId, draftId);
    if (!current) return null;
    const now = new Date().toISOString();
    const next: TaikosDraft = {
      ...current,
      title: patch.title ?? current.title,
      status: patch.status ?? current.status,
      payload: patch.payload ? { ...current.payload, ...patch.payload } : current.payload,
      estimatedValue: patch.estimatedValue ?? current.estimatedValue,
      linkedGoalId: patch.linkedGoalId ?? current.linkedGoalId,
      updatedAt: now,
      audit: {
        ...current.audit,
        lastEditedAt: now,
      },
    };

    await prisma.$executeRaw`
      UPDATE taikos_draft
      SET status = ${next.status},
          title = ${next.title},
          body = ${bodyFromDraft(next)},
          payload = ${JSON.stringify(next)}::jsonb,
          updated_at = ${now}::timestamptz
      WHERE salon_id = ${salonId} AND id = ${draftId}
    `;
    return next;
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function archiveDraftPostgres(
  salonId: string,
  draftId: string,
): Promise<TaikosDraft | null | { error: string }> {
  const current = await getDraftByIdPostgres(salonId, draftId);
  if (!current) return null;
  const now = new Date().toISOString();
  const next: TaikosDraft = {
    ...current,
    status: "archived",
    updatedAt: now,
    audit: { ...current.audit, archivedAt: now, lastEditedAt: now },
  };
  if ((await resolveTaikosStorageBackend()) !== "postgres") {
    return { error: "Postgres backend unavailable" };
  }
  try {
    await prisma.$executeRaw`
      UPDATE taikos_draft
      SET status = ${next.status},
          payload = ${JSON.stringify(next)}::jsonb,
          updated_at = ${now}::timestamptz
      WHERE salon_id = ${salonId} AND id = ${draftId}
    `;
    return next;
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function listAllDraftsForSalonPostgres(
  salonId: string,
  limit = 200,
): Promise<TaikosDraft[]> {
  return listDraftsPostgres({ salonId, limit });
}
