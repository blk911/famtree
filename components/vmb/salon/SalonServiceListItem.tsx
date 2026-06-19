"use client";

import {
  formatSalonDuration,
  formatSalonPrice,
  formatSelectedAddonSummary,
  salonServiceStatusLabel,
} from "@/lib/vmb/services/salon-service-summary";
import type { SalonFacingServiceOffer } from "@/lib/vmb/services/service-preset-types";
import type { SalonServiceEditorDraft } from "@/lib/vmb/services/salon-service-summary";

type Props = {
  name: string;
  service: Pick<SalonFacingServiceOffer, "addons">;
  draft: SalonServiceEditorDraft;
  selected: boolean;
  onSelect: () => void;
};

export function SalonServiceListItem({ name, service, draft, selected, onSelect }: Props) {
  const addonSummary = formatSelectedAddonSummary(service, draft);

  return (
    <li className={`vmb-salon-services__list-item${selected ? " vmb-salon-services__list-item--selected" : ""}`}>
      <button type="button" className="vmb-salon-services__list-button" onClick={onSelect}>
        <h3 className="vmb-salon-services__list-name">{name}</h3>
        <span
          className={`vmb-salon-services__status-badge vmb-salon-services__status-badge--${draft.status}`}
        >
          {salonServiceStatusLabel(draft.status)}
        </span>
        <p className="vmb-salon-services__list-meta">
          {formatSalonPrice(draft.priceCents)} · {formatSalonDuration(draft.durationMinutes)}
        </p>
        <p className="vmb-salon-services__list-addons">{addonSummary}</p>
        <span className="vmb-salon-services__list-action">{selected ? "Selected" : "Configure"}</span>
      </button>
    </li>
  );
}

export { formatSalonDuration, formatSalonPrice };
