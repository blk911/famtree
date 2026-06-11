import { promises as fs } from "fs";
import path from "path";
import { getTaikosDraftsFile } from "@/lib/taikos/paths";
import { summarizeDrafts } from "./draft-summary";
import type {
  CreateTaikosDraftInput,
  TaikosDraft,
  TaikosDraftStatus,
  TaikosDraftSummary,
  TaikosDraftType,
  UpdateTaikosDraftInput,
} from "./types";

type DraftFile = TaikosDraft[];

async function ensureDir(): Promise<void> {
  await fs.mkdir(path.dirname(getTaikosDraftsFile()), { recursive: true });
}

async function readAll(): Promise<DraftFile> {
  try {
    const raw = await fs.readFile(getTaikosDraftsFile(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DraftFile) : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(drafts: DraftFile): Promise<void> {
  await ensureDir();
  const file = getTaikosDraftsFile();
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(drafts, null, 2), "utf8");
  await fs.rename(tmp, file);
}

export type ListDraftsOptions = {
  salonId: string;
  status?: TaikosDraftStatus;
  type?: TaikosDraftType;
  limit?: number;
};

export async function listDrafts(options: ListDraftsOptions): Promise<TaikosDraft[]> {
  const all = await readAll();
  let rows = all.filter((d) => d.salonId === options.salonId);

  if (options.status) {
    rows = rows.filter((d) => d.status === options.status);
  }
  if (options.type) {
    rows = rows.filter((d) => d.draftType === options.type);
  }

  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const limit = options.limit ?? 50;
  return rows.slice(0, limit);
}

export async function getDraftById(
  salonId: string,
  draftId: string,
): Promise<TaikosDraft | null> {
  const all = await readAll();
  return all.find((d) => d.salonId === salonId && d.draftId === draftId) ?? null;
}

export async function createDraft(input: CreateTaikosDraftInput): Promise<TaikosDraft> {
  const now = new Date().toISOString();
  const draft: TaikosDraft = {
    ...input,
    draftId: input.draftId ?? `td-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  };

  const all = await readAll();
  all.push(draft);
  await writeAll(all);
  return draft;
}

export async function updateDraft(
  salonId: string,
  draftId: string,
  patch: UpdateTaikosDraftInput,
): Promise<TaikosDraft | null> {
  const all = await readAll();
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
    audit: {
      ...current.audit,
      lastEditedAt: now,
    },
  };
  all[idx] = next;
  await writeAll(all);
  return next;
}

export async function archiveDraft(
  salonId: string,
  draftId: string,
): Promise<TaikosDraft | null> {
  const now = new Date().toISOString();
  const all = await readAll();
  const idx = all.findIndex((d) => d.salonId === salonId && d.draftId === draftId);
  if (idx < 0) return null;

  const next: TaikosDraft = {
    ...all[idx],
    status: "archived",
    updatedAt: now,
    audit: {
      ...all[idx].audit,
      archivedAt: now,
      lastEditedAt: now,
    },
  };
  all[idx] = next;
  await writeAll(all);
  return next;
}

export async function summarizeDraftsForSalon(
  salonId: string,
  recentLimit = 6,
): Promise<TaikosDraftSummary> {
  const drafts = await listDrafts({ salonId, limit: 200 });
  return summarizeDrafts(drafts, recentLimit);
}
