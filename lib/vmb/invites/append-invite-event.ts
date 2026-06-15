import { appendInviteEventRecord } from "./invite-event-store";
import type { InviteEventPayload, InviteEventType, VmbInviteEvent } from "./invite-event-types";
import { isVmbInviteEvent } from "./invite-event-types";

export type AppendInviteEventInput = {
  eventType: InviteEventType;
  salonId: string;
  operatorId?: string;
  payload?: InviteEventPayload;
  eventId?: string;
  occurredAt?: string;
};

function newEventId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Safe server-side invite lifecycle writer — never throws; failures are logged and ignored by callers.
 */
export async function appendInviteEvent(
  input: AppendInviteEventInput,
): Promise<{ ok: true; event: VmbInviteEvent } | { ok: false; error: string }> {
  if (!input.salonId?.trim()) {
    return { ok: false, error: "salonId required" };
  }

  const event: VmbInviteEvent = {
    eventId: input.eventId?.trim() || newEventId(),
    eventType: input.eventType,
    salonId: input.salonId.trim(),
    operatorId: input.operatorId?.trim() || undefined,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    payload: input.payload ?? {},
  };

  if (!isVmbInviteEvent(event)) {
    return { ok: false, error: "Invalid invite event shape" };
  }

  const result = await appendInviteEventRecord(event);
  if ("error" in result) {
    console.warn("[vmb:invite-events]", result.error, event.eventType, event.salonId);
    return { ok: false, error: result.error };
  }

  return { ok: true, event: result.event };
}
