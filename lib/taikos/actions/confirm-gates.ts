import type { TaikosActionType } from "@/lib/taikos/types";

const OUTBOUND_OR_MUTATING = new Set<TaikosActionType>([
  "CREATE_INVITE_DRAFT",
  "CREATE_SERVICE_CARD_DRAFT",
  "CREATE_CAMPAIGN_DRAFT",
  "CONTINUE_PCN_INVITES",
  "PREVIEW_REFERRAL_ASK",
  "PREVIEW_REACTIVATION_MESSAGE",
  "REFRESH_BOOK_ANALYSIS",
]);

/** Phase 3: all mutating actions require explicit confirm; none send outbound. */
export function requiresConfirmation(type: TaikosActionType): boolean {
  return OUTBOUND_OR_MUTATING.has(type) || type === "VIEW_CLIENT_SEGMENT" || type === "VIEW_CALENDAR_GAP";
}

export function isDestructive(type: TaikosActionType): boolean {
  return type === "REFRESH_BOOK_ANALYSIS";
}

/** Phase 3 guarantee — no real sends or external mutations. */
export function allowsOutboundExecution(_type: TaikosActionType): boolean {
  return false;
}

export function confirmButtonLabel(type: TaikosActionType): string {
  if (type === "REFRESH_BOOK_ANALYSIS") return "Record Refresh Intent";
  return "Record Draft";
}

export function afterConfirmMessage(): string {
  return "Recorded. No message sent yet.";
}
