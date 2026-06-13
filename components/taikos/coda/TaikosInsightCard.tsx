"use client";

import { useMemo } from "react";
import {
  TodayProspectCardLayout,
  buildCompactLine,
} from "@/components/taikos/workflow/TodayProspectCardLayout";
import { useInlineActionWorkflow } from "@/components/taikos/workflow/useInlineActionWorkflow";
import { cardTypeFromActionType } from "@/lib/taikos/context/insight-card-type";
import { buildInsightGuideCopy } from "@/lib/taikos/context/today-conversation";
import type { TaikosInsight } from "@/lib/taikos/coda/types";
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
  const cardPreview = useMemo(
    () =>
      buildCardPreview({
        cardType: cardTypeFromActionType(insight.actionType),
        recipientName: insight.subjectName,
      }),
    [insight.actionType, insight.subjectName],
  );

  const displayName = insight.subjectName.split(/\s+/)[0] || insight.subjectName;

  const evidence = useMemo(() => {
    const items: string[] = [];
    if (insight.discovery.trim()) items.push(insight.discovery.trim());
    if (insight.objective.trim()) items.push(insight.objective.trim());
    return items.slice(0, 4);
  }, [insight]);

  return (
    <TodayProspectCardLayout
      displayName={displayName}
      roleLabel={insight.subjectLabel}
      confidence={insight.confidence}
      compactLine={buildCompactLine(insight.subjectLabel, guide.bodyLines, guide.suggestedNextStep)}
      bodyLines={guide.bodyLines}
      suggestedNextStep={guide.suggestedNextStep}
      evidence={evidence}
      cardPreview={cardPreview}
      workflow={workflow}
    />
  );
}
