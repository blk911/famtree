export const INVITE_EVENT_TYPES = [
  "invite_created",
  "invite_queued",
  "invite_sent",
  "invite_opened",
  "invite_claimed",
  "booking_started",
  "booking_completed",
  "invite_converted",
] as const;

export type InviteEventType = (typeof INVITE_EVENT_TYPES)[number];

export type InviteEventPayload = {
  inviteId?: string;
  draftId?: string;
  queueId?: string;
  clientName?: string;
  inviteCategory?: string;
  draftType?: string;
  channel?: string;
  ctaLabel?: string;
  templateType?: string;
  analysisId?: string;
  sourcePage?: string;
  salonDisplayName?: string;
  recipientContactSummary?: string;
  recipientContactHash?: string;
};

export type VmbInviteEvent = {
  eventId: string;
  eventType: InviteEventType;
  salonId: string;
  operatorId?: string;
  occurredAt: string;
  payload: InviteEventPayload;
};

export function isInviteEventType(value: unknown): value is InviteEventType {
  return typeof value === "string" && (INVITE_EVENT_TYPES as readonly string[]).includes(value);
}

export function isInviteEventPayload(value: unknown): value is InviteEventPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as InviteEventPayload;
  const stringFields: (keyof InviteEventPayload)[] = [
    "inviteId",
    "draftId",
    "queueId",
    "clientName",
    "inviteCategory",
    "draftType",
    "channel",
    "ctaLabel",
    "templateType",
    "analysisId",
    "sourcePage",
    "salonDisplayName",
    "recipientContactSummary",
    "recipientContactHash",
  ];
  return stringFields.every((field) => payload[field] === undefined || typeof payload[field] === "string");
}

export function isVmbInviteEvent(value: unknown): value is VmbInviteEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as VmbInviteEvent;
  return (
    typeof event.eventId === "string" &&
    event.eventId.length > 0 &&
    isInviteEventType(event.eventType) &&
    typeof event.salonId === "string" &&
    event.salonId.length > 0 &&
    (event.operatorId === undefined || typeof event.operatorId === "string") &&
    typeof event.occurredAt === "string" &&
    isInviteEventPayload(event.payload)
  );
}

export function inviteEventTypesForAdminPanel(
  panel: "claims" | "opens" | "conversions",
): InviteEventType[] {
  switch (panel) {
    case "claims":
      return ["invite_claimed"];
    case "opens":
      return ["invite_opened"];
    case "conversions":
      return ["invite_converted", "booking_started", "booking_completed"];
  }
}
