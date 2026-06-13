"use client";

import { CardBody } from "@/components/vmb/cards/CardBody";
import { CardHero } from "@/components/vmb/cards/CardHero";
import type { CardPreviewModel } from "@/lib/vmb/cards/card-preview-model";

type Props = {
  model: CardPreviewModel;
  editable?: boolean;
  compact?: boolean;
  onChange?: (patch: Partial<Pick<CardPreviewModel, "salutation" | "title" | "subtitle" | "body" | "cta">>) => void;
};

export function CardPreview({ model, editable, compact, onChange }: Props) {
  return (
    <article
      className={`vmb-card-preview${compact ? " vmb-card-preview--compact" : ""}`}
      data-card-type={model.cardType}
    >
      <CardHero layout={model.imageLayout} slots={model.imageSlots} accent={model.accent} tags={model.tags} />
      <CardBody model={model} editable={editable} onChange={onChange} />
    </article>
  );
}
