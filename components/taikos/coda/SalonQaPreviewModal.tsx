"use client";

import { useEffect, useMemo } from "react";
import { CardPreviewModal } from "@/components/vmb/cards/CardPreviewModal";
import { useInlineActionWorkflow } from "@/components/taikos/workflow/useInlineActionWorkflow";
import { cardActionLabel } from "@/lib/vmb/cards/card-type-labels";
import {
  qaActionToCardPreview,
  qaPreviewCardType,
  qaPreviewSourceId,
  qaPreviewTaikosAction,
  type QaCardPreviewContext,
} from "@/lib/taikos/salon-qa/qa-action-to-card-preview";
import type { SalonQaPreviewCardAction } from "@/lib/taikos/salon-qa/types";

type Props = {
  open: boolean;
  action: SalonQaPreviewCardAction | null;
  context: QaCardPreviewContext;
  onClose: () => void;
  onRefresh?: () => void;
};

export function SalonQaPreviewModal({ open, action, context, onClose, onRefresh }: Props) {
  const cardPreview = useMemo(
    () => (action ? qaActionToCardPreview(action, context) : null),
    [action, context],
  );

  const taikosAction = action ? qaPreviewTaikosAction(action) : "CREATE_INVITE_DRAFT";
  const sourceId = action ? qaPreviewSourceId(action) : "qa-preview-idle";

  const workflow = useInlineActionWorkflow({
    actionType: taikosAction,
    sourceId,
    analysisId: context.analysisId,
    onRefresh,
  });

  useEffect(() => {
    if (!open || !action) return;
    if (workflow.stage === "detected" && !workflow.busy) {
      void workflow.runPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- preview once when modal opens
  }, [open, action?.clientName, action?.cardType]);

  useEffect(() => {
    if (!open) {
      workflow.reset();
    }
  }, [open, workflow.reset]);

  if (!action || !cardPreview) return null;

  const displayName = action.clientName.split(/\s+/)[0] || action.clientName;
  const actionLabel = cardActionLabel(qaPreviewCardType(action), action.label);

  return (
    <CardPreviewModal
      open={open}
      cardPreview={cardPreview}
      displayName={displayName}
      actionLabel={actionLabel}
      workflow={workflow}
      onClose={onClose}
    />
  );
}
