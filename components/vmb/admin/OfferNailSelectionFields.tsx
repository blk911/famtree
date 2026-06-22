import { useEffect, useState } from "react";
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
  savingsAmount: number;
  onSavingsAmountChange: (savingsAmount: number) => void;
};

export function OfferNailSelectionFields({
  serviceIds,
  serviceOptionIds,
  onServiceIdsChange,
  onServiceOptionIdsChange,
  savingsAmount,
  onSavingsAmountChange,
}: Props) {
  const [discountEnabled, setDiscountEnabled] = useState(savingsAmount > 0);

  useEffect(() => {
    setDiscountEnabled(savingsAmount > 0);
  }, [savingsAmount]);

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
                    type="radio"
                    name="nail-service"
                    checked={checked}
                    onChange={() => onServiceIdsChange([choice.id])}
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
          Custom Add-ons
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

      <section className="vmb-offer-builder-savings" aria-labelledby="offer-savings-heading">
        <h3 id="offer-savings-heading" className="vmb-offer-builder-selections__heading">
          Offer Savings
        </h3>
        <div className="vmb-offer-builder-savings__controls">
          <label className="vmb-offer-builder-selections__choice">
            <input
              type="checkbox"
              checked={discountEnabled}
              onChange={(event) => {
                const enabled = event.target.checked;
                setDiscountEnabled(enabled);
                if (!enabled) onSavingsAmountChange(0);
              }}
            />
            <span>Discount</span>
          </label>
          {discountEnabled ? (
            <label className="vmb-offer-builder-savings__amount">
              <span>$</span>
              <input
                type="number"
                min={0}
                step={5}
                value={savingsAmount}
                aria-label="Offer savings amount"
                onChange={(event) =>
                  onSavingsAmountChange(Math.max(0, Math.round(Number(event.target.value) || 0)))
                }
              />
            </label>
          ) : null}
        </div>
      </section>
    </div>
  );
}
