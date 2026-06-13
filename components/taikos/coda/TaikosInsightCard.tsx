"use client";

import { useMemo } from "react";
import {
  TodayProspectCardLayout,
  buildProspectTeaser,
} from "@/components/taikos/workflow/TodayProspectCardLayout";
import { useInlineActionWorkflow } from "@/components/taikos/workflow/useInlineActionWorkflow";
import { cardTypeFromActionType } from "@/lib/taikos/context/insight-card-type";
import { buildInsightGuideCopy } from "@/lib/taikos/context/today-conversation";
import type { TaikosInsight } from "@/lib/taikos/coda/types";
import { cardActionLabel } from "@/lib/vmb/cards/card-type-labels";
import { buildCardPreview } from "@/lib/vmb/cards/card-template-engine";

type Props = {
  insight: TaikosInsight;
  onRefresh?: () => void;
};

export function TaikosInsightCard({ insight, onRefresh }: Props) {
  const workflow = useInlineActionWorkflow({
    actionType: insight.actionType,
    sourceId: insight.id,
    onRefresh,
  });

  const guide = useMemo(() => buildInsightGuideCopy(insight), [insight]);
  const cardType = cardTypeFromActionType(insight.actionType);
  const cardPreview = useMemo(
    () =>
      buildCardPreview({
        cardType,
        recipientName: insight.subjectName,
        subjectLabel: insight.subjectLabel,
        discoveryText: insight.discovery,
        recommendationText: insight.objective,
      }),
    [cardType, insight],
  );

  const displayName = insight.subjectName.split(/\s+/)[0] || insight.subjectName;
  const actionLabel = cardActionLabel(cardType, insight.suggestedAction);

  return (
    <TodayProspectCardLayout
      prospectId={insight.id}
      displayName={displayName}
      actionLabel={actionLabel}
      confidence={insight.confidence}
      collapsedTeaser={buildProspectTeaser(insight.subjectLabel, guide.bodyLines)}
      reasonLine={guide.bodyLines[0] ?? insight.discovery}
      suggestedNextStep={guide.suggestedNextStep}
      cardPreview={cardPreview}
      workflow={workflow}
    />
  );
}
