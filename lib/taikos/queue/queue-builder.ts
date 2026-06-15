import { recordActivity } from "@/lib/taikos/activity/activity-builder";
import { getDraftById, updateDraft } from "@/lib/taikos/drafts/draft-store";
import { findActiveGoalForCategory, goalCategoryForDraftType } from "@/lib/taikos/goals/goal-router";
import { getGoalById, linkDraftToGoal } from "@/lib/taikos/goals/goal-store";
import type { TaikosGoalListItem } from "@/lib/taikos/goals/types";
import { appendInviteEvent } from "@/lib/vmb/invites/append-invite-event";
import {
  parseQueuedInviteCardPayload,
  queueItemPreviewLine,
} from "@/lib/vmb/cards/queued-invite-card-payload";
import { createQueueItem } from "./queue-store";
import type { TaikosQueueItem } from "./types";

export async function enqueueDraft(
  salonId: string,
  operatorId: string,
  draftId: string,
  goals: TaikosGoalListItem[] = [],
): Promise<{ item: TaikosQueueItem; message: string } | { error: string }> {
  const draft = await getDraftById(salonId, draftId);
  if (!draft) return { error: "Draft not found" };
  if (draft.status === "archived" || draft.status === "cancelled") {
    return { error: "Draft is not available" };
  }

  const category = goalCategoryForDraftType(draft.draftType);
  const goalId =
    draft.linkedGoalId ??
    findActiveGoalForCategory(
      goals.map((g) => ({ ...g, status: g.status })),
      category,
    );
  let goalTitle: string | undefined;
  if (goalId) {
    const goal = await getGoalById(salonId, goalId);
    goalTitle = goal?.title;
    await linkDraftToGoal(salonId, goalId, draftId);
  }

  await updateDraft(salonId, draftId, {
    status: "approved",
    linkedGoalId: goalId,
    payload: { ...draft.payload, linkedGoalId: goalId },
  });

  const inviteCard = parseQueuedInviteCardPayload(draft.payload);
  const draftTitle = inviteCard
    ? queueItemPreviewLine(inviteCard, draft.title)
    : draft.title;

  const item = await createQueueItem({
    salonId,
    operatorId,
    draftId,
    draftTitle,
    draftType: draft.draftType,
    goalId,
    goalTitle,
    estimatedValue: draft.estimatedValue,
    inviteCard,
  });

  void appendInviteEvent({
    eventType: "invite_queued",
    salonId,
    operatorId,
    payload: {
      draftId,
      queueId: item.queueId,
      draftType: draft.draftType,
      clientName: inviteCard?.recipientName,
      ctaLabel: inviteCard?.primaryCta,
    },
  });

  await recordActivity({
    salonId,
    operatorId,
    kind: "queue_added",
    emoji: "✅",
    headline: `${draft.title} added to queue`,
    detail: goalTitle ? `Linked to goal: ${goalTitle}` : "Ready for future execution.",
    linkedDraftId: draftId,
    linkedQueueId: item.queueId,
    linkedGoalId: goalId,
    estimatedValue: draft.estimatedValue,
  });

  return {
    item,
    message: "Added to queue. No message sent yet.",
  };
}
