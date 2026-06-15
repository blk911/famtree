import { VmbRecipientInviteLanding } from "@/components/vmb/invites/VmbRecipientInviteLanding";
import { buildRecipientInvitePath } from "@/lib/vmb/invites/recipient-invite-url";
import { recordInviteOpened } from "@/lib/vmb/invites/record-invite-opened";
import { resolveRecipientInvite } from "@/lib/vmb/invites/resolve-recipient-invite";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ inviteId: string }>;
};

export default async function VmbRecipientInvitePage({ params }: PageProps) {
  const { inviteId } = await params;
  const resolved = await resolveRecipientInvite(inviteId);

  if (resolved.status === "available" && resolved.salonId) {
    await recordInviteOpened({
      salonId: resolved.salonId,
      inviteId: resolved.view.inviteId,
      draftId: resolved.view.draftId,
      clientName: resolved.clientName,
      sourcePage: buildRecipientInvitePath(resolved.view.inviteId),
    });
  }

  const { salonId: _salonId, clientName: _clientName, ...state } = resolved;
  return <VmbRecipientInviteLanding state={state} />;
}
