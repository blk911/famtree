"use client";

import {
  formatSalonDuration,
  formatSalonPrice,
  priceDiffersFromAdmin,
  type SalonServiceEditorDraft,
} from "@/lib/vmb/services/salon-service-summary";
import type { SalonFacingServiceOffer } from "@/lib/vmb/services/service-preset-types";
import type { SalonServiceLifecycleAction } from "@/lib/vmb/services/salon-service-lifecycle";

export type { SalonServiceEditorDraft };

type Props = {
  service: SalonFacingServiceOffer;
  draft: SalonServiceEditorDraft;
  saving: boolean;
  participatingTemplates: readonly string[];
  onDraftChange: (patch: Partial<SalonServiceEditorDraft>) => void;
  onToggleAddon: (addonId: string) => void;
  onAddonPriceChange: (addonId: string, priceCents: number) => void;
  onLifecycleAction: (action: SalonServiceLifecycleAction) => void;
};

function splitIncludedItems(text: string): string[] {
  return text
    .split(/[·•,|]|\.\s+/)
    .map((part) => part.trim().replace(/\.$/, ""))
    .filter(Boolean);
}

export function SalonServiceEditor({
  service,
  draft,
  saving,
  participatingTemplates,
  onDraftChange,
  onToggleAddon,
  onAddonPriceChange,
  onLifecycleAction,
}: Props) {
  const includedItems = service.includedText ? splitIncludedItems(service.includedText) : [];
  const servicePriceDiffers = priceDiffersFromAdmin(draft.priceCents, service.adminBasePriceCents);
  const durationDiffers = draft.durationMinutes !== service.adminDurationMinutes;
  const isActive = draft.status === "active";
  const canActivate = draft.status === "configured";

  return (
    <section className="vmb-salon-services__editor" aria-label={`Edit ${service.displayName}`}>
      <header className="vmb-salon-services__editor-head">
        <h2 className="vmb-salon-services__editor-title">{service.displayName}</h2>
        {service.shortDescription ? (
          <p className="vmb-salon-services__editor-desc">{service.shortDescription}</p>
        ) : null}
      </header>

      <div className="vmb-salon-services__field-grid">
        <label className="vmb-salon-services__field">
          <span>Salon price ($)</span>
          <input
            type="number"
            min={0}
            step={1}
            value={Math.round(draft.priceCents / 100)}
            onChange={(event) =>
              onDraftChange({
                priceCents: Math.max(0, Math.round(Number(event.target.value) * 100)),
              })
            }
          />
          {servicePriceDiffers ? (
            <span className="vmb-salon-services__default-note">
              Admin default {formatSalonPrice(service.adminBasePriceCents)}
            </span>
          ) : null}
        </label>

        <label className="vmb-salon-services__field">
          <span>Duration (min)</span>
          <input
            type="number"
            min={15}
            step={15}
            value={draft.durationMinutes}
            onChange={(event) =>
              onDraftChange({
                durationMinutes: Math.max(15, Number(event.target.value) || 15),
              })
            }
          />
          {durationDiffers ? (
            <span className="vmb-salon-services__default-note">
              Admin default {formatSalonDuration(service.adminDurationMinutes)}
            </span>
          ) : null}
        </label>
      </div>

      {includedItems.length > 0 ? (
        <section className="vmb-salon-services__included-block">
          <p className="vmb-salon-services__section-label">Included items</p>
          <p className="vmb-salon-services__included-line">{includedItems.join(" · ")}</p>
        </section>
      ) : null}

      <section className="vmb-salon-services__addons-block">
        <p className="vmb-salon-services__section-label">Available add-ons</p>
        {service.addons.length === 0 ? (
          <p className="vmb-salon-services__addons-empty">
            No add-ons configured for this service yet.
          </p>
        ) : (
          <ul className="vmb-salon-services__addon-editor-list">
            {service.addons.map((addon) => {
              const selected = draft.addonIds.includes(addon.addonId);
              const draftPrice = draft.addonPrices[addon.addonId] ?? addon.priceCents;
              const addonPriceDiffers = priceDiffersFromAdmin(draftPrice, addon.defaultPriceCents);
              return (
                <li key={addon.addonId} className="vmb-salon-services__addon-editor-row">
                  <label className="vmb-salon-services__addon-check">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleAddon(addon.addonId)}
                    />
                    <span className="vmb-salon-services__addon-name">{addon.label}</span>
                  </label>
                  <div className="vmb-salon-services__addon-price-wrap">
                    <label className="vmb-salon-services__addon-price-field">
                      <span className="vmb-salon-services__addon-price-label">Price</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        disabled={!selected}
                        value={Math.round(draftPrice / 100)}
                        onChange={(event) =>
                          onAddonPriceChange(
                            addon.addonId,
                            Math.max(0, Math.round(Number(event.target.value) * 100)),
                          )
                        }
                      />
                    </label>
                    {selected && addonPriceDiffers ? (
                      <p className="vmb-salon-services__default-note vmb-salon-services__default-note--inline">
                        Admin default {formatSalonPrice(addon.defaultPriceCents)}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {participatingTemplates.length > 0 ? (
        <section className="vmb-salon-services__participating-block">
          <p className="vmb-salon-services__section-label">Participates in</p>
          <ul className="vmb-salon-services__participating-list">
            {participatingTemplates.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="vmb-salon-services__lifecycle-note">
        Active services can appear on your salon page and in client invitations.
      </p>

      <footer className="vmb-salon-services__editor-footer">
        <div className="vmb-salon-services__editor-actions">
          <button
            type="button"
            className="vmb-salon-services__save"
            disabled={saving}
            onClick={() => onLifecycleAction("save")}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          {canActivate ? (
            <button
              type="button"
              className="vmb-salon-services__activate"
              disabled={saving}
              onClick={() => onLifecycleAction("activate")}
            >
              Activate Service
            </button>
          ) : null}
          {isActive ? (
            <button
              type="button"
              className="vmb-salon-services__deactivate"
              disabled={saving}
              onClick={() => onLifecycleAction("deactivate")}
            >
              Deactivate Service
            </button>
          ) : null}
        </div>
      </footer>
    </section>
  );
}
