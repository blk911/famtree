"use client";

import { buildServiceImageInput, getServiceImage } from "@/lib/vmb/assets";
import { ServicePhotoImage } from "@/components/vmb/salon/ServicePhotoImage";
import {
  formatSalonDuration,
  formatSalonPrice,
  listSelectedUpgradeLines,
  salonServiceStatusLabel,
} from "@/lib/vmb/services/salon-service-summary";
import type { SalonFacingServiceOffer } from "@/lib/vmb/services/service-preset-types";
import type { SalonServiceEditorDraft } from "@/lib/vmb/services/salon-service-summary";

type Props = {
  name: string;
  service: Pick<SalonFacingServiceOffer, "serviceOfferId" | "displayName" | "addons">;
  draft: SalonServiceEditorDraft;
  salonId?: string;
  selected: boolean;
  onSelect: () => void;
};

export function SalonServiceListItem({ name, service, draft, salonId, selected, onSelect }: Props) {
  const upgrades = listSelectedUpgradeLines(service, draft);
  const resolvedImage = getServiceImage(buildServiceImageInput(service, salonId));

  return (
    <li className={`vmb-salon-services__menu-card${selected ? " vmb-salon-services__menu-card--selected" : ""}`}>
      <button type="button" className="vmb-salon-services__menu-card-button" onClick={onSelect}>
        <div className="vmb-salon-services__menu-card-row">
          <div className="vmb-salon-services__menu-card-thumb">
            <ServicePhotoImage
              resolved={resolvedImage}
              alt=""
              sizes="56px"
              fill={false}
              width={56}
              height={56}
            />
          </div>
          <div className="vmb-salon-services__menu-card-body">
            <div className="vmb-salon-services__menu-card-head">
              <h3 className="vmb-salon-services__menu-card-name">{name}</h3>
              <span
                className={`vmb-salon-services__status-badge vmb-salon-services__status-badge--${draft.status}`}
              >
                {salonServiceStatusLabel(draft.status)}
              </span>
            </div>
            <p className="vmb-salon-services__menu-card-meta">
              {formatSalonPrice(draft.priceCents)} &bull; {formatSalonDuration(draft.durationMinutes)}
            </p>
            {upgrades.length > 0 ? (
              <div className="vmb-salon-services__menu-card-upgrades">
                <p className="vmb-salon-services__menu-card-upgrades-label">Selected Upgrades:</p>
                <ul className="vmb-salon-services__menu-card-upgrades-list">
                  {upgrades.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </button>
    </li>
  );
}

export { formatSalonDuration, formatSalonPrice };
