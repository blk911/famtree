import { formatOfferPrice } from "@/lib/vmb/salon-offers/salon-offer-pricing";
import type { ResolvedSalonOfferDisplay } from "@/lib/vmb/salon-offers/salon-offer-catalog-types";

type Props = {
  offer: ResolvedSalonOfferDisplay;
  variant?: "salon" | "client";
  onClaim?: () => void;
};

export function SalonOfferClientPreview({ offer, variant = "client", onClaim }: Props) {
  const isClient = variant === "client";

  return (
    <article className={`vmb-salon-offer-preview${isClient ? " vmb-salon-offer-preview--client" : ""}`}>
      {offer.imageUrl ? (
        <div
          className="vmb-salon-offer-preview__image"
          style={{ backgroundImage: `url(${offer.imageUrl})` }}
          role="img"
          aria-label=""
        />
      ) : null}
      <div className="vmb-salon-offer-preview__body">
        <h2 className="vmb-salon-offer-preview__title">{offer.name}</h2>
        {isClient ? (
          <p className="vmb-salon-offer-preview__eyebrow">Reserved for you.</p>
        ) : null}
        {offer.description ? (
          <p className="vmb-salon-offer-preview__desc">{offer.description}</p>
        ) : null}
        <div className="vmb-salon-offer-preview__includes">
          <p className="vmb-salon-offer-preview__includes-label">Includes:</p>
          <ul>
            {offer.includedLines.map((line) => (
              <li key={line}>✓ {line}</li>
            ))}
          </ul>
        </div>
        <div className="vmb-salon-offer-preview__price-block">
          <p className="vmb-salon-offer-preview__price-label">Special Price</p>
          <p className="vmb-salon-offer-preview__price">{formatOfferPrice(offer.priceCents)}</p>
          {!isClient && offer.calculatedPriceCents !== offer.priceCents ? (
            <p className="vmb-salon-offer-preview__calc">
              Calculated {formatOfferPrice(offer.calculatedPriceCents)}
            </p>
          ) : null}
        </div>
        {isClient && onClaim ? (
          <button type="button" className="vmb-salon-offer-preview__claim" onClick={onClaim}>
            Claim This Offer
          </button>
        ) : null}
      </div>
    </article>
  );
}
