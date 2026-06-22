import { getVmbInviteEventsFile } from "@/lib/vmb/paths";
import { prisma, resolveVmbStorageBackend } from "@/lib/vmb/db";
import { readJsonArray, writeJsonArray } from "@/lib/vmb/runtime-json-store";
import { assertVmbWritableBackend, vmbJsonFallbackAllowed, vmbProductionRequiresPostgres } from "@/lib/vmb/storage-policy";
import type { InviteEventType, VmbInviteEvent } from "./invite-event-types";
import { isVmbInviteEvent } from "./invite-event-types";

export const INVITE_EVENT_DUPLICATE_ID = "INVITE_EVENT_DUPLICATE_ID";
export const INVITE_EVENT_STORAGE_UNAVAILABLE = "INVITE_EVENT_STORAGE_UNAVAILABLE";

type InviteEventRow = { payload: unknown };

async function readAllEventsJson(): Promise<VmbInviteEvent[]> {
  return readJsonArray(getVmbInviteEventsFile(), isVmbInviteEvent);
}

async function readAllEvents(): Promise<VmbInviteEvent[]> {
  if ((await resolveVmbStorageBackend()) === "postgres") {
    try {
      const rows = await prisma.$queryRaw<InviteEventRow[]>`
        SELECT payload FROM vmb_invite_event ORDER BY occurred_at DESC
      `;
      return rows
        .map((row) => row.payload)
        .filter(isVmbInviteEvent);
    } catch {
      return [];
    }
  }
  return readAllEventsJson();
}

export async function listInviteEventsForSalon(
  salonId: string,
  options?: { types?: InviteEventType[]; limit?: number },
): Promise<VmbInviteEvent[]> {
  const limit = options?.limit ?? 200;
  const typeSet = options?.types?.length ? new Set(options.types) : null;
  const all = await readAllEvents();
  return all
    .filter((event) => event.salonId === salonId && (!typeSet || typeSet.has(event.eventType)))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, limit);
}

export async function hasInviteClaimForContact(
  salonId: string,
  inviteId: string,
  recipientContactHash: string,
): Promise<boolean> {
  const claims = await listInviteEventsForSalon(salonId, { types: ["invite_claimed"], limit: 500 });
  return claims.some(
    (event) =>
      event.payload.inviteId === inviteId &&
      event.payload.recipientContactHash === recipientContactHash,
  );
}

export async function getInviteEventById(eventId: string): Promise<VmbInviteEvent | undefined> {
  const all = await readAllEvents();
  return all.find((event) => event.eventId === eventId);
}

export async function appendInviteEventRecord(
  event: VmbInviteEvent,
): Promise<{ ok: true; event: VmbInviteEvent } | { error: string }> {
  const writable = await assertVmbWritableBackend();
  if (!writable.ok) {
    return {
      error: vmbProductionRequiresPostgres()
        ? INVITE_EVENT_STORAGE_UNAVAILABLE
        : writable.error,
    };
  }

  if (writable.backend === "postgres") {
    try {
      const inserted = await prisma.$queryRaw<Array<{ event_id: string }>>`
        INSERT INTO vmb_invite_event (
          event_id, event_type, salon_id, occurred_at, payload
        ) VALUES (
          ${event.eventId},
          ${event.eventType},
          ${event.salonId},
          ${new Date(event.occurredAt)},
          ${JSON.stringify(event)}::jsonb
        )
        ON CONFLICT DO NOTHING
        RETURNING event_id
      `;
      return inserted.length > 0
        ? { ok: true, event }
        : { error: INVITE_EVENT_DUPLICATE_ID };
    } catch {
      return { error: INVITE_EVENT_STORAGE_UNAVAILABLE };
    }
  }

  if (!vmbJsonFallbackAllowed()) {
    return { error: INVITE_EVENT_STORAGE_UNAVAILABLE };
  }

  const all = await readAllEventsJson();
  if (all.some((existing) => existing.eventId === event.eventId)) {
    return { error: INVITE_EVENT_DUPLICATE_ID };
  }

  const err = await writeJsonArray(getVmbInviteEventsFile(), [...all, event]);
  if (err) {
    return {
      error: vmbProductionRequiresPostgres() ? INVITE_EVENT_STORAGE_UNAVAILABLE : err,
    };
  }

  return { ok: true, event };
}
