import type { VmbOffer } from "@/lib/vmb/offers/offer-types";

type Props = {
  offer: VmbOffer | null;
  serviceNames?: string[];
  optionNames?: string[];
};

export function AdminOfferPreviewCard({ offer, serviceNames = [], optionNames = [] }: Props) {
  if (!offer) {
    return (
      <div className="vmb-admin-offer-preview">
        <p className="vmb-admin-offer-preview__label">Offer preview</p>
        <p className="vmb-admin-offer-preview__empty">Select an offer to preview.</p>
      </div>
    );
  }

  return (
    <div className="vmb-admin-offer-preview">
      <p className="vmb-admin-offer-preview__label">Offer preview</p>
      <div className="vmb-admin-nail-invite-card__offer-card vmb-admin-offer-preview__card">
        <p className="vmb-admin-nail-invite-card__offer-name">{offer.name}</p>
        {offer.valueLabel ? (
          <p className="vmb-admin-nail-invite-card__offer-price">{offer.valueLabel}</p>
        ) : null}
        <p className="vmb-admin-nail-invite-card__offer-desc">
          {offer.offerText || offer.description}
        </p>
        {serviceNames.length > 0 ? (
          <ul className="vmb-admin-offer-preview__list">
            {serviceNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        ) : null}
        {optionNames.length > 0 ? (
          <ul className="vmb-admin-offer-preview__list vmb-admin-offer-preview__list--addons">
            {optionNames.map((name) => (
              <li key={name}>+ {name}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
