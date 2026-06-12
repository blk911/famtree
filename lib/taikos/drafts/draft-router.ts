import type { TaikosDeliverable } from "@/lib/taikos/deliverables/types";
import type { TaikosActionType } from "@/lib/taikos/types";
import type { CreateTaikosDraftInput, TaikosDraft, TaikosDraftType } from "./types";

export function deliverableToDraftType(deliverable: TaikosDeliverable): TaikosDraftType | null {
  switch (deliverable.type) {
    case "invite":
      return "pcn_invite";
    case "campaign":
      return "campaign";
    case "service_card":
      return "service_card";
    case "referral_ask":
      return "referral_ask";
    case "reactivation":
      return "reactivation";
    case "calendar_gap":
      return "calendar_gap";
    default:
      return null;
  }
}

export function actionTypeCreatesDraft(type: TaikosActionType): boolean {
  return (
    type !== "VIEW_CLIENT_SEGMENT" &&
    type !== "REFRESH_BOOK_ANALYSIS"
  );
}

export function draftWorkspacePath(draftType: TaikosDraftType): string {
  if (draftType === "pcn_invite" || draftType === "referral_ask") return "/vmb/invites";
  if (draftType === "service_card") return "/vmb/service-cards";
  return "/vmb/campaigns";
}

export function draftDetailHref(draftType: TaikosDraftType, draftId: string): string {
  return `${draftWorkspacePath(draftType)}?draft=${encodeURIComponent(draftId)}`;
}

const WORKSPACE_DRAFT_TYPES: Record<
  "invites" | "campaigns" | "service-cards",
  readonly TaikosDraftType[]
> = {
  invites: ["pcn_invite", "referral_ask"],
  campaigns: ["campaign", "reactivation", "calendar_gap"],
  "service-cards": ["service_card"],
};

export function draftTypesForWorkspace(
  workspace: "invites" | "campaigns" | "service-cards",
): readonly TaikosDraftType[] {
  return WORKSPACE_DRAFT_TYPES[workspace];
}

export function buildDraftFromDeliverable(
  deliverable: TaikosDeliverable,
  meta: {
    salonId: string;
    operatorId: string;
    sourcePage: string;
    sourceRecommendationId?: string;
    sourceActionId?: string;
    actionType: TaikosActionType;
  },
): CreateTaikosDraftInput | null {
  const draftType = deliverableToDraftType(deliverable);
  if (!draftType) return null;

  const now = new Date().toISOString();
  let title = deliverable.title;
  let estimatedValue = 0;
  const payload: Record<string, unknown> = { ...deliverable };

  if (deliverable.type === "invite") {
    estimatedValue = deliverable.estimatedValue;
  } else if (deliverable.type === "campaign") {
    estimatedValue = deliverable.estimatedValue;
  } else if (deliverable.type === "reactivation") {
    estimatedValue = deliverable.estimatedValue;
    title = `Reactivation — ${deliverable.client}`;
  } else if (deliverable.type === "service_card") {
    title = deliverable.serviceName || deliverable.title;
  } else if (deliverable.type === "referral_ask") {
    title = `Referral ask — ${deliverable.referrer}`;
  } else if (deliverable.type === "calendar_gap") {
    title = deliverable.title || "Calendar opportunity";
  }

  return {
    salonId: meta.salonId,
    operatorId: meta.operatorId,
    sourcePage: meta.sourcePage,
    sourceRecommendationId: meta.sourceRecommendationId,
    sourceActionId: meta.sourceActionId,
    draftType,
    title,
    status: "draft",
    payload,
    estimatedValue,
    audit: {
      createdFromAction: meta.actionType,
      confirmedAt: now,
    },
  };
}

export function draftReviewHint(draft: TaikosDraft): string {
  const path = draftWorkspacePath(draft.draftType);
  if (path === "/vmb/invites") return "Review this invite later from Invites.";
  if (path === "/vmb/service-cards") return "Review this service card later from Service Cards.";
  return "Review this draft later from Campaigns.";
}
