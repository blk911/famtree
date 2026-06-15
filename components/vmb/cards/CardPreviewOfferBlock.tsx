"use client";

import type { CardPreviewModel } from "@/lib/vmb/cards/card-preview-model";

type Props = {
  model: CardPreviewModel;
};

export function CardPreviewOfferBlock({ model }: Props) {
  if (!model.includeOffer || !model.offer) return null;

  const prominent = model.offerProminent;

  return (
    <div
      className={`vmb-card-preview__offer${prominent ? " vmb-card-preview__offer--prominent" : ""}`}
      data-offer-category={model.offer.category}
    >
      {model.offer.valueLabel ? (
        <p className="vmb-card-preview__offer-value">{model.offer.valueLabel}</p>
      ) : null}
      <p className="vmb-card-preview__offer-text">{model.offer.offerText}</p>
      {model.offer.terms ? (
        <p className="vmb-card-preview__offer-terms">{model.offer.terms}</p>
      ) : null}
    </div>
  );
}
