import type { AiosSessionSnapshot } from "@/lib/taikos/types";
import { getSessionRecord, upsertSessionRecord, type TaikosSessionRecord } from "./session-store";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function toSnapshot(record: TaikosSessionRecord | null, aiosOpen = false): AiosSessionSnapshot {
  const day = todayKey();
  const firstLoginToday = !!record && record.loginDayKey === day && record.loginCountToday <= 1;
  return {
    firstLoginToday,
    loginCountToday: record?.loginDayKey === day ? record.loginCountToday : 0,
    lastLoginAt: record?.lastLoginAt,
    lastViewedPage: record?.lastViewedPage,
    lastAiosInteractionAt: record?.lastAiosInteractionAt,
    aiosOpen,
    briefingShownToday: record?.briefingShownToday ?? false,
    lastActivityWatermark: record?.lastActivityWatermark,
  };
}

export async function recordSalonLogin(
  salonId: string,
  operatorId: string,
): Promise<{ record: TaikosSessionRecord; snapshot: AiosSessionSnapshot }> {
  const existing = await getSessionRecord(salonId, operatorId);
  const day = todayKey();
  const now = new Date().toISOString();

  const loginCountToday =
    existing?.loginDayKey === day ? (existing.loginCountToday ?? 0) + 1 : 1;

  const record = await upsertSessionRecord(salonId, operatorId, {
    loginCountToday,
    loginDayKey: day,
    lastLoginAt: now,
    updatedAt: now,
  });

  return { record, snapshot: toSnapshot(record) };
}

export async function recordPageView(
  salonId: string,
  operatorId: string,
  pathname: string,
): Promise<AiosSessionSnapshot> {
  const record = await upsertSessionRecord(salonId, operatorId, {
    lastViewedPage: pathname,
    updatedAt: new Date().toISOString(),
  });
  return toSnapshot(record);
}

export async function recordAiosInteraction(
  salonId: string,
  operatorId: string,
): Promise<AiosSessionSnapshot> {
  const record = await upsertSessionRecord(salonId, operatorId, {
    lastAiosInteractionAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return toSnapshot(record);
}

export async function markBriefingShown(
  salonId: string,
  operatorId: string,
): Promise<AiosSessionSnapshot> {
  const record = await upsertSessionRecord(salonId, operatorId, {
    briefingShownToday: true,
    lastAiosInteractionAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return toSnapshot(record);
}

export async function getSessionSnapshot(
  salonId: string,
  operatorId: string,
  aiosOpen = false,
): Promise<AiosSessionSnapshot> {
  const record = await getSessionRecord(salonId, operatorId);
  return toSnapshot(record, aiosOpen);
}

export function shouldShowBriefing(snapshot: AiosSessionSnapshot, newActivity: boolean): boolean {
  if (snapshot.briefingShownToday && !newActivity) return false;
  if (snapshot.firstLoginToday) return true;
  if (snapshot.loginCountToday === 2) return true;
  return newActivity;
}

export function briefingVariant(
  snapshot: AiosSessionSnapshot,
  newActivity: boolean,
): "full" | "abbreviated" | "activity-only" | "skip" {
  if (!shouldShowBriefing(snapshot, newActivity)) return "skip";
  if (snapshot.firstLoginToday) return "full";
  if (snapshot.loginCountToday === 2) return "abbreviated";
  return "activity-only";
}
