import { buildCardPreview } from "@/lib/vmb/cards/card-template-engine";
import type { CardPreviewModel } from "@/lib/vmb/cards/card-preview-model";
import type { VmbCardType } from "@/lib/vmb/cards/card-types";
import type { VmbBookRecord } from "@/types/vmb/provider-ingest";
import { vmbCardTypeFromSuggested } from "./question-card-to-opportunity";
import type { SalonQaSuggestedAction } from "./types";
import { actionFromCardType } from "./qa-action-types";
import type { TaikosActionType } from "@/lib/taikos/types";

export type QaCardPreviewContext = {
  salonName?: string;
  operatorName?: string;
  records?: VmbBookRecord[];
  analysisId?: string;
};

function findClientRecord(records: VmbBookRecord[] | undefined, clientName: string): VmbBookRecord | undefined {
  if (!records?.length) return undefined;
  const needle = clientName.trim().toLowerCase();
  return records.find((r) => r.clientName.trim().toLowerCase() === needle);
}

function formatLastVisit(iso?: string): string | undefined {
  if (!iso?.trim()) return undefined;
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return iso;
  return new Date(parsed).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function qaPreviewCardType(action: Extract<SalonQaSuggestedAction, { kind: "preview_card" }>): VmbCardType {
  return vmbCardTypeFromSuggested(action.cardType);
}

export function qaPreviewTaikosAction(
  action: Extract<SalonQaSuggestedAction, { kind: "preview_card" }>,
): TaikosActionType {
  return actionFromCardType(action.cardType);
}

export function qaActionToCardPreview(
  action: Extract<SalonQaSuggestedAction, { kind: "preview_card" }>,
  context: QaCardPreviewContext,
): CardPreviewModel {
  const record = findClientRecord(context.records, action.clientName);
  return buildCardPreview({
    cardType: qaPreviewCardType(action),
    recipientName: action.clientName,
    salonName: context.salonName,
    techName: context.operatorName,
    serviceName: record?.serviceName,
    lastVisit: formatLastVisit(record?.lastVisitDate),
    ticketValue: record?.amountSpent,
    visitCount: record?.visitCount,
    subjectLabel: action.reason,
    recommendationText: action.reason,
  });
}

export function qaPreviewSourceId(action: Extract<SalonQaSuggestedAction, { kind: "preview_card" }>): string {
  const slug = action.clientName.trim().toLowerCase().replace(/\s+/g, "-");
  return `qa-action-${action.cardType}-${slug}`;
}
