import { getTaikosSessionsFile } from "@/lib/taikos/paths";
import {
  getSessionRecordPostgres,
  sessionRecordId,
  upsertSessionRecordPostgres,
} from "@/lib/taikos/session/session-store-postgres";
import { readJsonArray, writeJsonArray } from "@/lib/taikos/storage/taikos-json-store";
import { assertTaikosWritableBackend, taikosJsonFallbackAllowed } from "@/lib/taikos/storage/taikos-storage-policy";
import { resolveTaikosStorageBackend } from "@/lib/taikos/storage/taikos-db";

export type TaikosSessionRecord = {
  salonId: string;
  operatorId: string;
  loginCountToday: number;
  loginDayKey: string;
  lastLoginAt?: string;
  lastViewedPage?: string;
  lastAiosInteractionAt?: string;
  briefingShownToday: boolean;
  lastActivityWatermark?: string;
  updatedAt: string;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function isSession(item: unknown): item is TaikosSessionRecord {
  return (
    !!item &&
    typeof item === "object" &&
    typeof (item as TaikosSessionRecord).salonId === "string"
  );
}

async function readAllJson(): Promise<TaikosSessionRecord[]> {
  return readJsonArray(getTaikosSessionsFile(), isSession);
}

async function writeAllJson(records: TaikosSessionRecord[]): Promise<void> {
  const err = await writeJsonArray(getTaikosSessionsFile(), records);
  if (err) throw new Error(err);
}

function sessionKey(salonId: string, operatorId: string): string {
  return sessionRecordId(salonId, operatorId);
}

export async function getSessionRecord(
  salonId: string,
  operatorId: string,
): Promise<TaikosSessionRecord | null> {
  const backend = await resolveTaikosStorageBackend();
  if (backend === "postgres") {
    const row = await getSessionRecordPostgres(salonId, operatorId);
    if (row || !taikosJsonFallbackAllowed()) return row;
  }
  const all = await readAllJson();
  return all.find((r) => sessionKey(r.salonId, r.operatorId) === sessionKey(salonId, operatorId)) ?? null;
}

export async function upsertSessionRecord(
  salonId: string,
  operatorId: string,
  patch: Partial<TaikosSessionRecord>,
): Promise<TaikosSessionRecord> {
  const writable = await assertTaikosWritableBackend();
  if (!writable.ok) throw new Error(writable.error);

  if (writable.backend === "postgres") {
    const saved = await upsertSessionRecordPostgres(salonId, operatorId, patch);
    if ("error" in saved) throw new Error(saved.error);
    return saved;
  }

  const all = await readAllJson();
  const key = sessionKey(salonId, operatorId);
  const now = new Date().toISOString();
  const day = todayKey();
  const idx = all.findIndex((r) => sessionKey(r.salonId, r.operatorId) === key);
  const existing = idx >= 0 ? all[idx] : null;
  const loginDayKey = existing?.loginDayKey === day ? day : day;
  const loginCountToday = existing?.loginDayKey === day ? (existing.loginCountToday ?? 0) : 0;

  const next: TaikosSessionRecord = {
    lastLoginAt: existing?.lastLoginAt,
    lastViewedPage: existing?.lastViewedPage,
    lastAiosInteractionAt: existing?.lastAiosInteractionAt,
    briefingShownToday: existing?.briefingShownToday ?? false,
    lastActivityWatermark: existing?.lastActivityWatermark,
    loginCountToday,
    updatedAt: now,
    ...patch,
    salonId,
    operatorId,
    loginDayKey: patch.loginDayKey ?? loginDayKey,
  };

  if (idx >= 0) all[idx] = next;
  else all.push(next);
  await writeAllJson(all);
  return next;
}
