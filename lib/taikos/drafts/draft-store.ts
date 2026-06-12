import { getTaikosDraftsFile } from "@/lib/taikos/paths";
import {
  archiveDraftPostgres,
  createDraftPostgres,
  getDraftByIdPostgres,
  listAllDraftsForSalonPostgres,
  listDraftsPostgres,
  updateDraftPostgres,
} from "@/lib/taikos/drafts/draft-store-postgres";
import { readJsonArray, writeJsonArray } from "@/lib/taikos/storage/taikos-json-store";
import { assertTaikosWritableBackend, taikosJsonFallbackAllowed } from "@/lib/taikos/storage/taikos-storage-policy";
import { resolveTaikosStorageBackend } from "@/lib/taikos/storage/taikos-db";
import { summarizeDrafts } from "./draft-summary";
import type {
  CreateTaikosDraftInput,
  TaikosDraft,
  TaikosDraftStatus,
  TaikosDraftSummary,
  TaikosDraftType,
  UpdateTaikosDraftInput,
} from "./types";

function isDraft(item: unknown): item is TaikosDraft {
  return (
    !!item &&
    typeof item === "object" &&
    typeof (item as TaikosDraft).draftId === "string"
  );
}

async function readAllJson(): Promise<TaikosDraft[]> {
  return readJsonArray(getTaikosDraftsFile(), isDraft);
}

async function writeAllJson(drafts: TaikosDraft[]): Promise<void> {
  const err = await writeJsonArray(getTaikosDraftsFile(), drafts);
  if (err) throw new Error(err);
}

export type ListDraftsOptions = {
  salonId: string;
  status?: TaikosDraftStatus;
  type?: TaikosDraftType;
  limit?: number;
};

export async function listDrafts(options: ListDraftsOptions): Promise<TaikosDraft[]> {
  const backend = await resolveTaikosStorageBackend();
  if (backend === "postgres") {
    const rows = await listDraftsPostgres(options);
    if (rows.length > 0 || !taikosJsonFallbackAllowed()) return rows;
  }

  const all = await readAllJson();
  let rows = all.filter((d) => d.salonId === options.salonId);
  if (options.status) rows = rows.filter((d) => d.status === options.status);
  if (options.type) rows = rows.filter((d) => d.draftType === options.type);
  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return rows.slice(0, options.limit ?? 50);
}

export async function getDraftById(
  salonId: string,
  draftId: string,
): Promise<TaikosDraft | null> {
  const backend = await resolveTaikosStorageBackend();
  if (backend === "postgres") {
    const row = await getDraftByIdPostgres(salonId, draftId);
    if (row || !taikosJsonFallbackAllowed()) return row;
  }
  const all = await readAllJson();
  return all.find((d) => d.salonId === salonId && d.draftId === draftId) ?? null;
}

export async function createDraft(input: CreateTaikosDraftInput): Promise<TaikosDraft> {
  const writable = await assertTaikosWritableBackend();
  if (!writable.ok) throw new Error(writable.error);

  if (writable.backend === "postgres") {
    const created = await createDraftPostgres(input);
    if ("error" in created) throw new Error(created.error);
    return created;
  }

  const now = new Date().toISOString();
  const draft: TaikosDraft = {
    ...input,
    draftId: input.draftId ?? `td-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  };
  const all = await readAllJson();
  all.push(draft);
  await writeAllJson(all);
  return draft;
}

export async function updateDraft(
  salonId: string,
  draftId: string,
  patch: UpdateTaikosDraftInput,
): Promise<TaikosDraft | null> {
  const writable = await assertTaikosWritableBackend();
  if (!writable.ok) throw new Error(writable.error);

  if (writable.backend === "postgres") {
    const updated = await updateDraftPostgres(salonId, draftId, patch);
    if (updated && "error" in updated) throw new Error(updated.error);
    return updated && !("error" in updated) ? updated : null;
  }

  const all = await readAllJson();
  const idx = all.findIndex((d) => d.salonId === salonId && d.draftId === draftId);
  if (idx < 0) return null;
  const now = new Date().toISOString();
  const current = all[idx];
  const next: TaikosDraft = {
    ...current,
    title: patch.title ?? current.title,
    status: patch.status ?? current.status,
    payload: patch.payload ? { ...current.payload, ...patch.payload } : current.payload,
    estimatedValue: patch.estimatedValue ?? current.estimatedValue,
    linkedGoalId: patch.linkedGoalId ?? current.linkedGoalId,
    updatedAt: now,
    audit: { ...current.audit, lastEditedAt: now },
  };
  all[idx] = next;
  await writeAllJson(all);
  return next;
}

export async function archiveDraft(
  salonId: string,
  draftId: string,
): Promise<TaikosDraft | null> {
  const writable = await assertTaikosWritableBackend();
  if (!writable.ok) throw new Error(writable.error);

  if (writable.backend === "postgres") {
    const archived = await archiveDraftPostgres(salonId, draftId);
    if (archived && "error" in archived) throw new Error(archived.error);
    return archived && !("error" in archived) ? archived : null;
  }

  const now = new Date().toISOString();
  const all = await readAllJson();
  const idx = all.findIndex((d) => d.salonId === salonId && d.draftId === draftId);
  if (idx < 0) return null;
  const next: TaikosDraft = {
    ...all[idx],
    status: "archived",
    updatedAt: now,
    audit: { ...all[idx].audit, archivedAt: now, lastEditedAt: now },
  };
  all[idx] = next;
  await writeAllJson(all);
  return next;
}

export async function summarizeDraftsForSalon(
  salonId: string,
  recentLimit = 6,
): Promise<TaikosDraftSummary> {
  const backend = await resolveTaikosStorageBackend();
  const drafts =
    backend === "postgres"
      ? await listAllDraftsForSalonPostgres(salonId, 200)
      : await listDrafts({ salonId, limit: 200 });
  return summarizeDrafts(drafts, recentLimit);
}
