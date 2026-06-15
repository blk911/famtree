import { findDraftByIdGlobal } from "@/lib/taikos/drafts/draft-store";
import type { TaikosDraftStatus } from "@/lib/taikos/drafts/types";
import { findQueueItemByDraftIdGlobal } from "@/lib/taikos/queue/queue-store";
import { buildPersonalInviteCopy } from "@/lib/vmb/cards/personal-invite-copy";
import type { VmbCardType } from "@/lib/vmb/cards/card-types";
import { parseQueuedInviteCardPayload } from "@/lib/vmb/cards/queued-invite-card-payload";
import { findInviteDraftByIdGlobal } from "@/lib/vmb/invite-drafts/invite-draft-store";
import { queuedInviteCardToPreviewModel } from "@/lib/vmb/invites/queued-invite-card-to-preview-model";
import type { RecipientInvitePageState } from "@/lib/vmb/invites/recipient-invite-view";
import { toRecipientInvitePageState } from "@/lib/vmb/invites/recipient-invite-view";
import { getVmbTrialLead } from "@/lib/vmb/trial-store";
import type { InviteDraftCategory, InviteDraftStatus } from "@/types/vmb/invite-draft";

const TAIKOS_VIEWABLE_STATUSES = new Set<TaikosDraftStatus>([
  "approved",
  "ready_to_send",
  "sent",
]);

const TAIKOS_EXPIRED_STATUSES = new Set<TaikosDraftStatus>(["archived", "cancelled"]);

const VMB_VIEWABLE_STATUSES = new Set<InviteDraftStatus>(["approved", "sent"]);
const VMB_EXPIRED_STATUSES = new Set<InviteDraftStatus>(["skipped"]);

export type ResolvedRecipientInvite = RecipientInvitePageState & {
  salonId?: string;
  clientName?: string;
};

function inviteCategoryToCardType(category: InviteDraftCategory): VmbCardType {
  switch (category) {
    case "private_client_network":
      return "pcn_invite";
    case "new_client_welcome":
      return "refresh_card";
    case "revenue_touch":
      return "reactivation_card";
    case "trusted_intro_request":
      return "referral_invite";
    default:
      return "pcn_invite";
  }
}

async function salonDisplayContext(salonId: string): Promise<{ salonDisplayName: string; techName?: string }> {
  const lead = await getVmbTrialLead(salonId);
  return {
    salonDisplayName: lead?.salonName?.trim() || "Your Salon",
    techName: lead?.ownerName?.trim() || undefined,
  };
}

export async function resolveRecipientInvite(inviteId: string): Promise<ResolvedRecipientInvite> {
  const trimmed = inviteId.trim();
  if (!trimmed) {
    return { status: "not_found", inviteId: trimmed };
  }

  const taikosDraft = await findDraftByIdGlobal(trimmed);
  if (taikosDraft) {
    if (TAIKOS_EXPIRED_STATUSES.has(taikosDraft.status)) {
      return {
        status: "expired",
        inviteId: trimmed,
        message: "This invite is no longer available.",
      };
    }
    if (!TAIKOS_VIEWABLE_STATUSES.has(taikosDraft.status)) {
      return {
        status: "expired",
        inviteId: trimmed,
        message: "This invite has not been released yet.",
      };
    }

    const inviteCard =
      parseQueuedInviteCardPayload(taikosDraft.payload) ??
      (await findQueueItemByDraftIdGlobal(trimmed))?.inviteCard;
    if (!inviteCard) {
      return { status: "not_found", inviteId: trimmed };
    }

    const salonContext = await salonDisplayContext(taikosDraft.salonId);
    const previewModel = queuedInviteCardToPreviewModel(inviteCard, salonContext);
    const pageState = toRecipientInvitePageState({
      inviteId: trimmed,
      draftId: taikosDraft.draftId,
      salonDisplayName: salonContext.salonDisplayName,
      techName: salonContext.techName,
      previewModel,
      primaryCta: inviteCard.primaryCta,
    });

    return {
      ...pageState,
      salonId: taikosDraft.salonId,
      clientName: inviteCard.recipientName,
    };
  }

  const vmbDraft = await findInviteDraftByIdGlobal(trimmed);
  if (vmbDraft) {
    if (VMB_EXPIRED_STATUSES.has(vmbDraft.status)) {
      return {
        status: "expired",
        inviteId: trimmed,
        message: "This invite is no longer available.",
      };
    }
    if (!VMB_VIEWABLE_STATUSES.has(vmbDraft.status)) {
      return {
        status: "expired",
        inviteId: trimmed,
        message: "This invite has not been released yet.",
      };
    }

    const salonContext = await salonDisplayContext(vmbDraft.trialId);
    const cardType = inviteCategoryToCardType(vmbDraft.inviteCategory);
    const copy = buildPersonalInviteCopy({
      recipientName: vmbDraft.clientName,
      salonName: salonContext.salonDisplayName,
      techName: salonContext.techName,
      cardType,
    });
    if (vmbDraft.editableMessage.trim()) {
      copy.inviteMessage = vmbDraft.editableMessage.trim();
    }

    const previewModel = queuedInviteCardToPreviewModel(
      {
        cardType,
        recipientName: vmbDraft.clientName,
        actionLabel: vmbDraft.subject || "Private Client Invite",
        greeting: copy.greeting,
        personalConnection: copy.personalConnection,
        inviteMessage: copy.inviteMessage,
        offerMessage: copy.offerMessage,
        signature: copy.signature,
        primaryCta: copy.primaryCta,
      },
      salonContext,
    );

    const pageState = toRecipientInvitePageState({
      inviteId: trimmed,
      draftId: vmbDraft.draftId,
      salonDisplayName: salonContext.salonDisplayName,
      techName: salonContext.techName,
      previewModel,
      primaryCta: copy.primaryCta,
    });

    return {
      ...pageState,
      salonId: vmbDraft.trialId,
      clientName: vmbDraft.clientName,
    };
  }

  return { status: "not_found", inviteId: trimmed };
}
