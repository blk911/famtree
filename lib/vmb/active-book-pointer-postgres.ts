import type { ActiveBookPointer } from "@/lib/vmb/active-book-pointer-types";
import { prisma, resolveVmbStorageBackend } from "@/lib/vmb/db";

function isPointer(item: unknown): item is ActiveBookPointer {
  return (
    !!item &&
    typeof item === "object" &&
    typeof (item as ActiveBookPointer).salonId === "string" &&
    typeof (item as ActiveBookPointer).analysisId === "string"
  );
}

function parsePayload(raw: unknown): ActiveBookPointer | undefined {
  if (!raw) return undefined;
  if (typeof raw === "string") {
    try {
      return parsePayload(JSON.parse(raw) as unknown);
    } catch {
      return undefined;
    }
  }
  return isPointer(raw) ? raw : undefined;
}

type PointerRow = { payload: unknown };

export async function getActiveBookPointerPostgres(
  salonId: string,
): Promise<ActiveBookPointer | undefined> {
  const backend = await resolveVmbStorageBackend();
  if (backend !== "postgres") return undefined;

  try {
    const rows = await prisma.$queryRaw<PointerRow[]>`
      SELECT payload FROM vmb_active_book WHERE salon_id = ${salonId.trim()} LIMIT 1
    `;
    return parsePayload(rows[0]?.payload);
  } catch {
    return undefined;
  }
}

export async function listActiveBookPointersPostgres(): Promise<ActiveBookPointer[]> {
  const backend = await resolveVmbStorageBackend();
  if (backend !== "postgres") return [];

  try {
    const rows = await prisma.$queryRaw<PointerRow[]>`
      SELECT payload FROM vmb_active_book ORDER BY updated_at DESC
    `;
    return rows.map((row) => parsePayload(row.payload)).filter((p): p is ActiveBookPointer => !!p);
  } catch {
    return [];
  }
}

export async function saveActiveBookPointerPostgres(
  pointer: ActiveBookPointer,
): Promise<string | null> {
  try {
    const backend = await resolveVmbStorageBackend();
    if (backend !== "postgres") return "Postgres backend unavailable";

    await prisma.$executeRaw`
      INSERT INTO vmb_active_book (
        salon_id, analysis_id, record_count, client_count, payload, updated_at
      )
      VALUES (
        ${pointer.salonId},
        ${pointer.analysisId},
        ${pointer.recordCount},
        ${pointer.clientCount},
        ${JSON.stringify(pointer)}::jsonb,
        now()
      )
      ON CONFLICT (salon_id) DO UPDATE SET
        analysis_id = EXCLUDED.analysis_id,
        record_count = EXCLUDED.record_count,
        client_count = EXCLUDED.client_count,
        payload = EXCLUDED.payload,
        updated_at = now()
    `;
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
