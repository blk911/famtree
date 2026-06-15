"use client";

import type { CardPreviewModel } from "@/lib/vmb/cards/card-preview-model";

type Props = {
  model: CardPreviewModel;
};

export function CardPreviewOfferBlock({ model }: Props) {
  if (!model.includeOffer || !model.offer) return null;

  const prominent = model.offerProminent;
  const valueLabel = model.offer.valueLabel?.toUpperCase();

  return (
    <div
      className={`vmb-card-preview__offer${prominent ? " vmb-card-preview__offer--prominent" : ""}`}
      data-offer-category={model.offer.category}
    >
      {prominent ? <p className="vmb-card-preview__offer-heading">Your birthday treat:</p> : null}
      {valueLabel ? (
        <p className="vmb-card-preview__offer-value">{valueLabel}</p>
      ) : null}
      <p className="vmb-card-preview__offer-text">{model.offer.offerText}</p>
      {model.offer.serviceName || model.offer.upgradeName ? (
        <div className="vmb-card-preview__offer-service-refs">
          {model.offer.serviceName ? (
            <p>
              <span className="vmb-card-preview__offer-ref-label">Service:</span> {model.offer.serviceName}
            </p>
          ) : null}
          {model.offer.upgradeName ? (
            <p>
              <span className="vmb-card-preview__offer-ref-label">Upgrade:</span> {model.offer.upgradeName}
            </p>
          ) : null}
        </div>
      ) : null}
      {model.offer.terms ? (
        <p className="vmb-card-preview__offer-terms">{model.offer.terms}</p>
      ) : null}
    </div>
  );
}
