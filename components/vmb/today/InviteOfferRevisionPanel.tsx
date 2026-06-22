"use client";

import { useState } from "react";
import type { SalonFacingServiceOffer } from "@/lib/vmb/services/service-preset-types";

export type ConfirmedInviteOffer = {
  serviceId: string;
  addonIds: string[];
  offerPrice: string;
};

type Props = {
  services: SalonFacingServiceOffer[];
  value: ConfirmedInviteOffer;
  onUse: (offer: ConfirmedInviteOffer) => void;
  onEditingChange: (editing: boolean) => void;
};

export function InviteOfferRevisionPanel({ services, value, onUse, onEditingChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [serviceId, setServiceId] = useState(value.serviceId);
  const [addonIds, setAddonIds] = useState<string[]>(value.addonIds);
  const [offerPrice, setOfferPrice] = useState(value.offerPrice);

  const confirmedService = services.find((service) => service.serviceOfferId === value.serviceId);
  const confirmedAddons = confirmedService?.addons.filter(
    (addon) => addon.enabled && value.addonIds.includes(addon.addonId),
  ) ?? [];
  const draftService = services.find((service) => service.serviceOfferId === serviceId);
  const draftOptions = draftService?.addons.filter((addon) => addon.enabled) ?? [];

  function begin() {
    setServiceId(value.serviceId);
    setAddonIds([...value.addonIds]);
    setOfferPrice(value.offerPrice);
    setEditing(true);
    onEditingChange(true);
  }

  function cancel() {
    setEditing(false);
    onEditingChange(false);
  }

  function selectService(nextServiceId: string) {
    const service = services.find((row) => row.serviceOfferId === nextServiceId);
    const nextAddonIds = service?.addons.filter((addon) => addon.enabled).map((addon) => addon.addonId) ?? [];
    const totalCents = (service?.priceCents ?? 0) + (service?.addons ?? [])
      .filter((addon) => addon.enabled && nextAddonIds.includes(addon.addonId))
      .reduce((sum, addon) => sum + addon.priceCents, 0);
    setServiceId(nextServiceId);
    setAddonIds(nextAddonIds);
    setOfferPrice((totalCents / 100).toFixed(2));
  }

  function toggleAddon(addonId: string) {
    if (!draftService) return;
    const next = addonIds.includes(addonId)
      ? addonIds.filter((id) => id !== addonId)
      : [...addonIds, addonId];
    const totalCents = draftService.priceCents + draftService.addons
      .filter((addon) => addon.enabled && next.includes(addon.addonId))
      .reduce((sum, addon) => sum + addon.priceCents, 0);
    setAddonIds(next);
    setOfferPrice((totalCents / 100).toFixed(2));
  }

  function useOffer() {
    if (!draftService) return;
    onUse({ serviceId, addonIds: [...addonIds], offerPrice });
    setEditing(false);
    onEditingChange(false);
  }

  return (
    <div className="vmb-today-command__style-builder">
      {!editing ? (
        <div className="vmb-today-command__style-summary">
          <div><span>Salon offer</span><strong>{confirmedService?.displayName ?? "No active service"}</strong></div>
          {confirmedAddons.map((addon) => (
            <div key={addon.addonId}>
              <span>{addon.label}</span>
              <strong>+${(addon.priceCents / 100).toFixed(2)}</strong>
            </div>
          ))}
          <div className="vmb-today-command__style-summary-total">
            <span>Offer total</span><strong>${Number(value.offerPrice || 0).toFixed(2)}</strong>
          </div>
          <button type="button" onClick={begin}>Revise this offer</button>
        </div>
      ) : (
        <>
          <div className="vmb-today-command__style-controls">
            <label>
              <span>Active service</span>
              <select value={serviceId} onChange={(event) => selectService(event.target.value)}>
                {services.length === 0 ? <option value="">No active services</option> : null}
                {services.map((service) => (
                  <option key={service.serviceOfferId} value={service.serviceOfferId}>
                    {service.displayName} · ${(service.priceCents / 100).toFixed(2)}
                  </option>
                ))}
              </select>
            </label>
            <label className="vmb-today-command__price-field">
              <span>Adjust offer price</span>
              <div><b>$</b><input type="number" min="0" step="0.01" value={offerPrice} onChange={(event) => setOfferPrice(event.target.value)} /></div>
            </label>
          </div>
          {draftOptions.length > 0 ? (
            <div>
              <span>Custom add-ons</span>
              <div className="vmb-today-command__revision-pills">
                {draftOptions.map((option) => {
                  const selected = addonIds.includes(option.addonId);
                  return (
                    <button
                      key={option.addonId}
                      type="button"
                      className={selected ? "is-selected" : undefined}
                      aria-pressed={selected}
                      onClick={() => toggleAddon(option.addonId)}
                    >
                      {selected ? <span aria-hidden="true">✓</span> : null}
                      <strong>{option.label}</strong>
                      <small>+${(option.priceCents / 100).toFixed(2)}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : <p className="vmb-today-command__style-note">No custom add-ons are available for this service.</p>}
          <div className="vmb-today-command__revision-actions">
            <button type="button" className="vmb-today-command__revision-done" onClick={useOffer}>Use this offer</button>
            <button type="button" className="vmb-today-command__revision-cancel" onClick={cancel}>Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}
