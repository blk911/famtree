import { VmbRecipientInviteClaimForm } from "@/components/vmb/invites/VmbRecipientInviteClaimForm";
import {
  resolveRecipientInvite,
  type ResolvedRecipientInvite,
} from "@/lib/vmb/invites/resolve-recipient-invite";
import type { RecipientInvitePageState } from "@/lib/vmb/invites/recipient-invite-view";
import { toRecipientInviteClaimView } from "@/lib/vmb/invites/submit-invite-claim";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ inviteId: string }>;
};

function toPageState(resolved: ResolvedRecipientInvite): RecipientInvitePageState {
  if (resolved.status === "available") {
    return { status: "available", view: resolved.view };
  }
  if (resolved.status === "expired") {
    return { status: "expired", inviteId: resolved.inviteId, message: resolved.message };
  }
  return { status: "not_found", inviteId: resolved.inviteId };
}

export default async function VmbRecipientInviteClaimPage({ params }: PageProps) {
  const { inviteId } = await params;
  const resolved = await resolveRecipientInvite(inviteId);
  const state = toPageState(resolved);
  const claimView =
    resolved.status === "available" ? toRecipientInviteClaimView(resolved.view) : undefined;

  return <VmbRecipientInviteClaimForm state={state} claimView={claimView} />;
}
