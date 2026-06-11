import { buildCalendarGapDeliverable } from "@/lib/taikos/deliverables/calendar-gap-builder";
import { buildCampaignDeliverable } from "@/lib/taikos/deliverables/campaign-draft-builder";
import { buildClientSegmentDeliverable } from "@/lib/taikos/deliverables/client-segment-builder";
import { buildPcnInviteDeliverable } from "@/lib/taikos/deliverables/invite-draft-builder";
import { buildReferralAskDeliverable } from "@/lib/taikos/deliverables/referral-ask-builder";
import { buildReactivationDeliverable } from "@/lib/taikos/deliverables/reactivation-message-builder";
import { buildServiceCardDeliverable } from "@/lib/taikos/deliverables/service-card-draft-builder";
import type { TaikosDeliverable } from "@/lib/taikos/deliverables/types";
import type { AiosContextPacket } from "@/lib/taikos/types";
import { ACTION_REGISTRY } from "./action-registry";
import { afterConfirmMessage, isDestructive, requiresConfirmation } from "./confirm-gates";
import {
  actionTypeCreatesDraft,
  buildDraftFromDeliverable,
  draftDetailHref,
  draftReviewHint,
} from "@/lib/taikos/drafts/draft-router";
import { createDraft } from "@/lib/taikos/drafts/draft-store";
import { appendActionLogEntry } from "./action-log-store";
import type {
  TaikosActionContract,
  TaikosActionPreviewResult,
  TaikosActionType,
  TaikosConfirmResult,
} from "./types";

function buildDeliverable(
  type: TaikosActionType,
  ctx: AiosContextPacket,
  payload?: Record<string, string>,
): TaikosDeliverable {
  switch (type) {
    case "CREATE_INVITE_DRAFT":
      return buildPcnInviteDeliverable(ctx, { variant: "invite" });
    case "CONTINUE_PCN_INVITES":
      return buildPcnInviteDeliverable(ctx, { variant: "pcn" });
    case "CREATE_SERVICE_CARD_DRAFT":
      return buildServiceCardDeliverable(ctx, payload?.serviceName);
    case "CREATE_CAMPAIGN_DRAFT":
      return buildCampaignDeliverable(ctx);
    case "VIEW_CLIENT_SEGMENT":
      return buildClientSegmentDeliverable(ctx);
    case "VIEW_CALENDAR_GAP":
      return buildCalendarGapDeliverable(ctx);
    case "PREVIEW_REFERRAL_ASK":
      return buildReferralAskDeliverable(ctx);
    case "PREVIEW_REACTIVATION_MESSAGE":
      return buildReactivationDeliverable(ctx);
    case "REFRESH_BOOK_ANALYSIS":
      return buildCampaignDeliverable({
        ...ctx,
        opportunities: [
          {
            id: "refresh-intent",
            title: "Book Refresh",
            description: "Record intent to upload a fresh client export.",
            estimatedValue: 0,
            severity: "info",
          },
        ],
      });
    default:
      return buildPcnInviteDeliverable(ctx);
  }
}

function deliverableSummary(d: TaikosDeliverable): string {
  if (d.type === "invite") return `${d.title} · ${d.suggestedClients.length} clients`;
  if (d.type === "service_card") return d.serviceName;
  if (d.type === "campaign") return d.objective;
  if (d.type === "referral_ask") return d.referrer;
  if (d.type === "reactivation") return d.client;
  if (d.type === "client_segment") return `${d.count} overdue`;
  if (d.type === "calendar_gap") return d.slots.join(", ");
  return "deliverable";
}

export function previewTaikosAction(
  type: TaikosActionType,
  ctx: AiosContextPacket,
  payload?: Record<string, string>,
): TaikosActionPreviewResult {
  const reg = ACTION_REGISTRY[type];
  const deliverable = buildDeliverable(type, ctx, payload);
  const previewId = `preview-${type}-${ctx.salonId}-${Date.now()}`;

  const action: TaikosActionContract = {
    actionId: previewId,
    type,
    label: reg.label,
    description: reg.description,
    source: reg.source,
    payload: payload ?? {},
    requiresConfirmation: requiresConfirmation(type),
    destructive: isDestructive(type),
    status: "preview",
  };

  return {
    action,
    deliverable,
    previewId,
    noSendGuarantee: true,
  };
}

export async function confirmTaikosAction(
  type: TaikosActionType,
  ctx: AiosContextPacket,
  options: {
    previewId: string;
    sourcePage: string;
    sourceRecommendationId?: string;
    payload?: Record<string, string>;
  },
): Promise<TaikosConfirmResult> {
  const reg = ACTION_REGISTRY[type];
  const deliverable = buildDeliverable(type, ctx, options.payload);

  let savedDraftId: string | undefined;
  let savedDraftHref: string | undefined;
  let savedDraftReviewHint: string | undefined;

  if (actionTypeCreatesDraft(type)) {
    const draftInput = buildDraftFromDeliverable(deliverable, {
      salonId: ctx.salonId,
      operatorId: ctx.operatorId,
      sourcePage: options.sourcePage,
      sourceRecommendationId: options.sourceRecommendationId,
      sourceActionId: options.previewId,
      actionType: type,
    });
    if (draftInput) {
      const saved = await createDraft(draftInput);
      savedDraftId = saved.draftId;
      savedDraftHref = draftDetailHref(saved.draftType, saved.draftId);
      savedDraftReviewHint = draftReviewHint(saved);
    }
  }

  const logEntry = await appendActionLogEntry({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    salonId: ctx.salonId,
    operatorId: ctx.operatorId,
    actionType: type,
    actionLabel: reg.label,
    payloadSummary: deliverableSummary(deliverable),
    status: "confirmed",
    sourcePage: options.sourcePage,
    sourceRecommendationId: options.sourceRecommendationId,
    deliverableType: deliverable.type,
    deliverableId: savedDraftId ?? deliverable.draftId,
  });

  return {
    ok: true,
    logEntry,
    message: afterConfirmMessage(!!savedDraftId),
    draftId: savedDraftId,
    draftHref: savedDraftHref,
    draftReviewHint: savedDraftReviewHint,
  };
}
