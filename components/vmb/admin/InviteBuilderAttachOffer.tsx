import Link from "next/link";
import { AdminOfferPreviewCard } from "@/components/vmb/admin/AdminOfferPreviewCard";
import type { VmbOffer } from "@/lib/vmb/offers/offer-types";

const OFFER_CATALOG_HREF = "/admin/invites/offers";

type Props = {
  attachedOfferId: string;
  savedOffers: readonly VmbOffer[];
  selectedOffer: VmbOffer | undefined;
  serviceNames: string[];
  rewardLabels: string[];
  onAttachedOfferChange: (offerId: string) => void;
};

export function InviteBuilderAttachOffer({
  attachedOfferId,
  savedOffers,
  selectedOffer,
  serviceNames,
  rewardLabels,
  onAttachedOfferChange,
}: Props) {
  return (
    <section className="vmb-invite-builder__attach" aria-label="Attach offer">
      <h3 className="vmb-invite-builder__attach-title">Attach Offer</h3>

      {savedOffers.length === 0 ? (
        <div className="vmb-invite-builder__attach-empty">
          <p className="vmb-invite-builder__attach-note">
            No saved offers yet. Create one in Offer Catalog.
          </p>
          <Link href={OFFER_CATALOG_HREF} className="vmb-invite-builder__attach-link">
            Open Offer Catalog
          </Link>
        </div>
      ) : (
        <>
          <label className="vmb-invite-builder__attach-field">
            <span className="vmb-invite-builder__attach-label">Saved offer</span>
            <select
              value={attachedOfferId}
              onChange={(event) => onAttachedOfferChange(event.target.value)}
              aria-label="Select saved offer"
            >
              <option value="">Select saved offer</option>
              {savedOffers.map((offer) => (
                <option key={offer.id} value={offer.id}>
                  {offer.name}
                </option>
              ))}
            </select>
          </label>
          <p className="vmb-invite-builder__attach-note">
            Attaches the offer block only — invite headline, body, and CTA stay unchanged.
          </p>
          <Link href={OFFER_CATALOG_HREF} className="vmb-invite-builder__attach-link">
            Open Offer Catalog
          </Link>
        </>
      )}

      {selectedOffer ? (
        <div className="vmb-invite-builder__attach-preview">
          <AdminOfferPreviewCard
            offer={selectedOffer}
            serviceNames={serviceNames}
            addonLabels={rewardLabels}
            label="Selected offer"
          />
        </div>
      ) : null}
    </section>
  );
}
