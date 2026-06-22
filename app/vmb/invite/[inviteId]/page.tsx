import { VmbRecipientInviteLanding } from "@/components/vmb/invites/VmbRecipientInviteLanding";
import { buildRecipientInvitePath } from "@/lib/vmb/invites/recipient-invite-url";
import { recordInviteOpened } from "@/lib/vmb/invites/record-invite-opened";
import { resolveRecipientInvite } from "@/lib/vmb/invites/resolve-recipient-invite";
import { markSentInviteOpened } from "@/lib/vmb/invites/sent-invite-store";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ inviteId: string }>;
};

export default async function VmbRecipientInvitePage({ params }: PageProps) {
  const { inviteId } = await params;
  const resolved = await resolveRecipientInvite(inviteId);

  if (resolved.status === "available" && resolved.sentInvite) {
    const opened = await markSentInviteOpened(resolved.sentInvite);
    if (!("error" in opened)) {
      await recordInviteOpened({
        salonId: resolved.sentInvite.salonId,
        inviteId: resolved.view.inviteId,
        clientName: resolved.sentInvite.snapshot.recipientName,
        sourcePage: buildRecipientInvitePath(resolved.view.inviteId),
      });
    }
  }

  const { sentInvite: _sentInvite, ...state } = resolved;
  return <VmbRecipientInviteLanding state={state} />;
}
