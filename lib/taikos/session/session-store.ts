import { promises as fs } from "fs";
import path from "path";
import { getTaikosDataDir, getTaikosSessionsFile } from "@/lib/taikos/paths";

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

type SessionFile = TaikosSessionRecord[];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(getTaikosDataDir(), { recursive: true });
}

async function readAll(): Promise<SessionFile> {
  try {
    const raw = await fs.readFile(getTaikosSessionsFile(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SessionFile) : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(records: SessionFile): Promise<void> {
  await ensureDir();
  const tmp = `${getTaikosSessionsFile()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(records, null, 2), "utf8");
  await fs.rename(tmp, getTaikosSessionsFile());
}

function sessionKey(salonId: string, operatorId: string): string {
  return `${salonId}::${operatorId}`;
}

export async function getSessionRecord(
  salonId: string,
  operatorId: string,
): Promise<TaikosSessionRecord | null> {
  const all = await readAll();
  return all.find((r) => sessionKey(r.salonId, r.operatorId) === sessionKey(salonId, operatorId)) ?? null;
}

export async function upsertSessionRecord(
  salonId: string,
  operatorId: string,
  patch: Partial<TaikosSessionRecord>,
): Promise<TaikosSessionRecord> {
  const all = await readAll();
  const key = sessionKey(salonId, operatorId);
  const now = new Date().toISOString();
  const day = todayKey();

  const idx = all.findIndex((r) => sessionKey(r.salonId, r.operatorId) === key);
  const existing = idx >= 0 ? all[idx] : null;

  const loginDayKey = existing?.loginDayKey === day ? day : day;
  const loginCountToday =
    existing?.loginDayKey === day ? (existing.loginCountToday ?? 0) : 0;

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

  await writeAll(all);
  return next;
}
