"use client";

import { CardBody } from "@/components/vmb/cards/CardBody";
import { CardHero } from "@/components/vmb/cards/CardHero";
import { PersonalInvitePreview } from "@/components/vmb/cards/PersonalInvitePreview";
import { isPersonalInviteCard } from "@/lib/vmb/cards/card-type-labels";
import type { CardPreviewModel } from "@/lib/vmb/cards/card-preview-model";

type Props = {
  model: CardPreviewModel;
  editable?: boolean;
  compact?: boolean;
  variant?: "default" | "salon-invite";
  onChange?: (patch: Partial<Pick<CardPreviewModel, "salutation" | "title" | "subtitle" | "body" | "cta">>) => void;
};

export function CardPreview({ model, editable, compact, variant = "default", onChange }: Props) {
  const personalInvite = isPersonalInviteCard(model.cardType);
  const salonInvite = personalInvite && variant === "salon-invite";

  if (salonInvite) {
    return <PersonalInvitePreview model={model} />;
  }

  return (
    <article
      className={`vmb-card-preview${compact ? " vmb-card-preview--compact" : ""}${personalInvite ? " vmb-card-preview--personal" : ""}`}
      data-card-type={model.cardType}
    >
      {personalInvite ? null : (
        <CardHero layout={model.imageLayout} slots={model.imageSlots} accent={model.accent} tags={model.tags} />
      )}
      <CardBody model={model} editable={editable} onChange={onChange} />
    </article>
  );
}
