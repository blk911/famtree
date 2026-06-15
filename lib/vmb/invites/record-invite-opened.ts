import { appendInviteEvent } from "./append-invite-event";

export type RecordInviteOpenedInput = {
  salonId: string;
  inviteId: string;
  draftId?: string;
  clientName?: string;
  sourcePage: string;
  channel?: string;
};

export async function recordInviteOpened(input: RecordInviteOpenedInput): Promise<void> {
  await appendInviteEvent({
    eventType: "invite_opened",
    salonId: input.salonId,
    payload: {
      inviteId: input.inviteId,
      draftId: input.draftId,
      clientName: input.clientName,
      sourcePage: input.sourcePage,
      channel: input.channel ?? "recipient_landing",
    },
  });
}
