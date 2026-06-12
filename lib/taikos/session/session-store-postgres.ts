import { parsePayload, prisma, resolveTaikosStorageBackend } from "@/lib/taikos/storage/taikos-db";
import type { TaikosSessionRecord } from "@/lib/taikos/session/session-store";

function isSession(item: unknown): item is TaikosSessionRecord {
  return (
    !!item &&
    typeof item === "object" &&
    typeof (item as TaikosSessionRecord).salonId === "string" &&
    typeof (item as TaikosSessionRecord).operatorId === "string"
  );
}

function rowToSession(row: { payload: unknown }): TaikosSessionRecord | undefined {
  return parsePayload(row.payload, isSession);
}

export function sessionRecordId(salonId: string, operatorId: string): string {
  return `${salonId}::${operatorId}`;
}

export async function getSessionRecordPostgres(
  salonId: string,
  operatorId: string,
): Promise<TaikosSessionRecord | null> {
  if ((await resolveTaikosStorageBackend()) !== "postgres") return null;
  try {
    const id = sessionRecordId(salonId, operatorId);
    const rows = await prisma.$queryRaw<Array<{ payload: unknown }>>`
      SELECT payload FROM taikos_session WHERE id = ${id} LIMIT 1
    `;
    return rowToSession(rows[0] ?? { payload: null }) ?? null;
  } catch {
    return null;
  }
}

export async function upsertSessionRecordPostgres(
  salonId: string,
  operatorId: string,
  patch: Partial<TaikosSessionRecord>,
): Promise<TaikosSessionRecord | { error: string }> {
  if ((await resolveTaikosStorageBackend()) !== "postgres") {
    return { error: "Postgres backend unavailable" };
  }
  try {
    const id = sessionRecordId(salonId, operatorId);
    const existing = await getSessionRecordPostgres(salonId, operatorId);
    const now = new Date().toISOString();
    const next: TaikosSessionRecord = {
      lastLoginAt: existing?.lastLoginAt,
      lastViewedPage: existing?.lastViewedPage,
      lastAiosInteractionAt: existing?.lastAiosInteractionAt,
      briefingShownToday: existing?.briefingShownToday ?? false,
      lastActivityWatermark: existing?.lastActivityWatermark,
      loginCountToday: existing?.loginCountToday ?? 0,
      updatedAt: now,
      ...patch,
      salonId,
      operatorId,
      loginDayKey: patch.loginDayKey ?? existing?.loginDayKey ?? now.slice(0, 10),
    };

    await prisma.$executeRaw`
      INSERT INTO taikos_session (id, salon_id, status, payload, created_at, updated_at)
      VALUES (
        ${id},
        ${salonId},
        ${next.briefingShownToday ? "active" : "open"},
        ${JSON.stringify(next)}::jsonb,
        ${now}::timestamptz,
        ${now}::timestamptz
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        payload = EXCLUDED.payload,
        updated_at = EXCLUDED.updated_at
    `;
    return next;
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
