"use client";

import Image from "next/image";
import {
  buildServiceImageInput,
  getServiceImage,
} from "@/lib/vmb/assets";
import {
  calculateServiceRevenueSummary,
  formatSalonDurationMinutes,
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
  salonId?: string;
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
  salonId,
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
  const canGoLive = draft.status === "configured";
  const revenue = calculateServiceRevenueSummary(draft, service);
  const resolvedImage = getServiceImage(buildServiceImageInput(service, salonId));

  return (
    <section className="vmb-salon-services__studio" aria-label={`Service studio for ${service.displayName}`}>
      <div className="vmb-salon-services__preview">
        <Image
          src={resolvedImage.imageUrl}
          alt={resolvedImage.title || service.displayName}
          fill
          sizes="(max-width: 768px) 100vw, 420px"
          className="vmb-salon-services__preview-image"
          priority={false}
        />
      </div>

      <header className="vmb-salon-services__studio-head">
        <h2 className="vmb-salon-services__studio-title">{service.displayName}</h2>
        {service.shortDescription ? (
          <p className="vmb-salon-services__studio-tagline">{service.shortDescription}</p>
        ) : null}
      </header>

      <section className="vmb-salon-services__revenue" aria-label="Revenue summary">
        <p className="vmb-salon-services__revenue-heading">Revenue Summary</p>
        <div className="vmb-salon-services__revenue-ticket">
          <span className="vmb-salon-services__revenue-ticket-label">Typical Ticket</span>
          <strong className="vmb-salon-services__revenue-ticket-value">
            {formatSalonPrice(revenue.typicalTicketCents)}
          </strong>
        </div>
        <dl className="vmb-salon-services__revenue-lines">
          <div className="vmb-salon-services__revenue-line">
            <dt>Base Service</dt>
            <dd>{formatSalonPrice(revenue.baseCents)}</dd>
          </div>
          <div className="vmb-salon-services__revenue-line">
            <dt>Selected Upgrades</dt>
            <dd>{formatSalonPrice(revenue.upgradesCents)}</dd>
          </div>
        </dl>
      </section>

      <section className="vmb-salon-services__product-facts">
        <div className="vmb-salon-services__product-fact">
          <span className="vmb-salon-services__product-fact-label">Base Service</span>
          <div className="vmb-salon-services__product-fact-input">
            <span className="vmb-salon-services__product-fact-prefix">$</span>
            <input
              type="number"
              min={0}
              step={1}
              aria-label="Base service price"
              value={Math.round(draft.priceCents / 100)}
              onChange={(event) =>
                onDraftChange({
                  priceCents: Math.max(0, Math.round(Number(event.target.value) * 100)),
                })
              }
            />
          </div>
          {servicePriceDiffers ? (
            <span className="vmb-salon-services__default-note">
              Admin default {formatSalonPrice(service.adminBasePriceCents)}
            </span>
          ) : null}
        </div>
        <div className="vmb-salon-services__product-fact">
          <span className="vmb-salon-services__product-fact-label">Duration</span>
          <div className="vmb-salon-services__product-fact-input">
            <input
              type="number"
              min={15}
              step={15}
              aria-label="Service duration in minutes"
              value={draft.durationMinutes}
              onChange={(event) =>
                onDraftChange({
                  durationMinutes: Math.max(15, Number(event.target.value) || 15),
                })
              }
            />
            <span className="vmb-salon-services__product-fact-suffix">minutes</span>
          </div>
          {durationDiffers ? (
            <span className="vmb-salon-services__default-note">
              Admin default {formatSalonDurationMinutes(service.adminDurationMinutes)}
            </span>
          ) : null}
        </div>
      </section>

      {includedItems.length > 0 ? (
        <section className="vmb-salon-services__included-block">
          <p className="vmb-salon-services__section-label">Included Service Elements</p>
          <p className="vmb-salon-services__included-line">{includedItems.join(" · ")}</p>
        </section>
      ) : null}

      <section className="vmb-salon-services__addons-block">
        <p className="vmb-salon-services__section-label">Available Upgrades</p>
        {service.addons.length === 0 ? (
          <p className="vmb-salon-services__addons-empty">No upgrades for this service yet.</p>
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
          <p className="vmb-salon-services__section-label">Featured in invitations</p>
          <ul className="vmb-salon-services__participating-list">
            {participatingTemplates.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="vmb-salon-services__lifecycle-note">
        Live services appear on your salon page and in client invitations.
      </p>

      <footer className="vmb-salon-services__editor-footer">
        <div className="vmb-salon-services__editor-actions">
          <button
            type="button"
            className="vmb-salon-services__save"
            disabled={saving}
            onClick={() => onLifecycleAction("save")}
          >
            {saving ? "Saving…" : isActive ? "Update Service" : "Save Draft"}
          </button>
          {canGoLive ? (
            <button
              type="button"
              className="vmb-salon-services__activate"
              disabled={saving}
              onClick={() => onLifecycleAction("activate")}
            >
              Go Live
            </button>
          ) : null}
          {isActive ? (
            <button
              type="button"
              className="vmb-salon-services__deactivate"
              disabled={saving}
              onClick={() => onLifecycleAction("deactivate")}
            >
              Pause Service
            </button>
          ) : null}
        </div>
      </footer>
    </section>
  );
}
