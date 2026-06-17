import type { VmbOffer } from "@/lib/vmb/offers/offer-types";

type Props = {
  attachedOfferId: string;
  catalogOffers: readonly VmbOffer[];
  onAttachedOfferChange: (offerId: string) => void;
};

export function InviteBuilderInsertElements({
  attachedOfferId,
  catalogOffers,
  onAttachedOfferChange,
}: Props) {
  const selectedOffer = catalogOffers.find((offer) => offer.id === attachedOfferId);

  return (
    <section className="vmb-invite-builder__inserts" aria-label="Insert elements">
      <h3 className="vmb-invite-builder__inserts-title">Insert elements</h3>

      <div className="vmb-invite-builder__insert-row">
        <span className="vmb-invite-builder__insert-label">Offer</span>
        <div className="vmb-invite-builder__insert-control">
          <select
            value={attachedOfferId}
            onChange={(event) => onAttachedOfferChange(event.target.value)}
            aria-label="Select offer from catalog"
          >
            <option value="">Select from Offer Catalog</option>
            {catalogOffers.map((offer) => (
              <option key={offer.id} value={offer.id}>
                {offer.name}
              </option>
            ))}
          </select>
          <p className="vmb-invite-builder__insert-note">
            {selectedOffer
              ? `${selectedOffer.name} — offer block only, invite copy unchanged.`
              : "No offer attached yet."}
          </p>
        </div>
      </div>

      <div className="vmb-invite-builder__insert-row vmb-invite-builder__insert-row--muted">
        <span className="vmb-invite-builder__insert-label">Image</span>
        <span className="vmb-invite-builder__insert-status">Coming next.</span>
      </div>

      <div className="vmb-invite-builder__insert-row">
        <span className="vmb-invite-builder__insert-label">Tokens</span>
        <div className="vmb-invite-builder__token-list">
          <code>{"{clientName}"}</code>
          <code>{"{salonName}"}</code>
          <code>{"{providerName}"}</code>
        </div>
      </div>

      <div className="vmb-invite-builder__insert-row vmb-invite-builder__insert-row--muted">
        <span className="vmb-invite-builder__insert-label">Expiration</span>
        <span className="vmb-invite-builder__insert-status">Coming later.</span>
      </div>
    </section>
  );
}
