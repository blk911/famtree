import {
  NAIL_OFFER_ADDON_CHOICES,
  NAIL_OFFER_SERVICE_CHOICES,
  toggleOfferIdSelection,
} from "@/lib/vmb/admin/nail-offer-builder-selections";

type Props = {
  serviceIds: string[] | undefined;
  serviceOptionIds: string[] | undefined;
  onServiceIdsChange: (serviceIds: string[]) => void;
  onServiceOptionIdsChange: (serviceOptionIds: string[]) => void;
};

export function OfferNailSelectionFields({
  serviceIds,
  serviceOptionIds,
  onServiceIdsChange,
  onServiceOptionIdsChange,
}: Props) {
  return (
    <div className="vmb-offer-builder-selections">
      <section className="vmb-offer-builder-selections__group" aria-labelledby="offer-nail-services-heading">
        <h3 id="offer-nail-services-heading" className="vmb-offer-builder-selections__heading">
          Nail Services
        </h3>
        <ul className="vmb-offer-builder-selections__choices">
          {NAIL_OFFER_SERVICE_CHOICES.map((choice) => {
            const checked = (serviceIds ?? []).includes(choice.id);
            return (
              <li key={choice.id}>
                <label className="vmb-offer-builder-selections__choice">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onServiceIdsChange(toggleOfferIdSelection(serviceIds, choice.id))
                    }
                  />
                  <span>{choice.label}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="vmb-offer-builder-selections__group" aria-labelledby="offer-rewards-heading">
        <h3 id="offer-rewards-heading" className="vmb-offer-builder-selections__heading">
          Rewards Included
        </h3>
        <ul className="vmb-offer-builder-selections__choices">
          {NAIL_OFFER_ADDON_CHOICES.map((choice) => {
            const checked = (serviceOptionIds ?? []).includes(choice.id);
            return (
              <li key={choice.id}>
                <label className="vmb-offer-builder-selections__choice">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onServiceOptionIdsChange(toggleOfferIdSelection(serviceOptionIds, choice.id))
                    }
                  />
                  <span>{choice.label}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
