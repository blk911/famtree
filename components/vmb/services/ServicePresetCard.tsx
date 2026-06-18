"use client";

import { useState } from "react";

export type ServicePresetCardAddon = {
  id: string;
  label: string;
  price: number;
  selected: boolean;
  active: boolean;
  onToggle?: () => void;
};

export type ServicePresetCardProps = {
  mode: "admin" | "salon" | "client";
  title: string;
  description: string;
  /** Price in cents */
  price: number;
  durationMinutes: number;
  includedText?: string;
  addons?: ServicePresetCardAddon[];
  enabled?: boolean;
  active?: boolean;
  saving?: boolean;
  configureOpen?: boolean;
  onToggleEnabled?: () => void;
  onSave?: () => void;
  onConfigure?: () => void;
  onPriceChange?: (cents: number) => void;
  onDurationChange?: (minutes: number) => void;
  onToggleActive?: () => void;
  onEditPreset?: () => void;
  onClaim?: () => void;
  /** Salon-only: published invitation templates that include this service. */
  participatingTemplates?: readonly string[];
  inviteThumbnailUrl?: string;
};

function formatPrice(cents: number): string {
  const safe = Number.isFinite(cents) ? Math.max(0, cents) : 0;
  return `$${(safe / 100).toFixed(0)}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

function splitIncludedItems(text: string): string[] {
  return text
    .split(/[·•,|]|\.\s+/)
    .map((part) => part.trim().replace(/\.$/, ""))
    .filter(Boolean);
}

export function ServicePresetCard({
  mode,
  title,
  description,
  price,
  durationMinutes,
  includedText,
  addons = [],
  enabled = false,
  active = true,
  saving = false,
  configureOpen: configureOpenProp,
  onToggleEnabled,
  onSave,
  onConfigure,
  onPriceChange,
  onDurationChange,
  onToggleActive,
  onEditPreset,
  onClaim,
  participatingTemplates = [],
  inviteThumbnailUrl,
}: ServicePresetCardProps) {
  const [configureOpenInternal, setConfigureOpenInternal] = useState(false);
  const configureOpen = configureOpenProp ?? configureOpenInternal;

  function handleConfigure() {
    if (onConfigure) {
      onConfigure();
      return;
    }
    setConfigureOpenInternal((open) => !open);
  }

  const visibleAddons = addons.filter((addon) => addon.active);
  const includedItems = includedText ? splitIncludedItems(includedText) : [];
  const isSalon = mode === "salon";
  const isAdmin = mode === "admin";
  const isClient = mode === "client";
  const showConfigureFields = isSalon && configureOpen && (onPriceChange || onDurationChange);

  return (
    <article
      className={[
        "vmb-service-preset-card",
        `vmb-service-preset-card--${mode}`,
        isSalon && enabled ? "vmb-service-preset-card--enabled" : "",
        isSalon && !enabled ? "vmb-service-preset-card--quiet" : "",
        isAdmin && !active ? "vmb-service-preset-card--inactive" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="vmb-service-preset-card__head">
        <h2 className="vmb-service-preset-card__title">{title}</h2>
        {description ? <p className="vmb-service-preset-card__desc">{description}</p> : null}
        <p className="vmb-service-preset-card__pill">
          {isClient ? formatPrice(price) : `Starts at ${formatPrice(price)}`} ·{" "}
          {formatDuration(durationMinutes)}
        </p>
      </header>

      {includedItems.length > 0 ? (
        <section className="vmb-service-preset-card__includes" aria-label="Includes">
          <p className="vmb-service-preset-card__section-label">Includes</p>
          <p className="vmb-service-preset-card__included-line">
            {includedItems.join(" · ")}
          </p>
        </section>
      ) : null}

      {visibleAddons.length > 0 ? (
        <section className="vmb-service-preset-card__upgrades" aria-label="Available upgrades">
          <p className="vmb-service-preset-card__section-label">Available upgrades</p>
          <ul className="vmb-service-preset-card__addon-list">
            {visibleAddons.map((addon) => {
              const interactive = Boolean(addon.onToggle) && !isClient;
              return (
                <li key={addon.id}>
                  {interactive ? (
                    <label
                      className={`vmb-service-preset-card__addon vmb-service-preset-card__addon--interactive${addon.selected ? " vmb-service-preset-card__addon--selected" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={addon.selected}
                        onChange={addon.onToggle}
                        aria-label={addon.label}
                      />
                      <span className="vmb-service-preset-card__addon-label">{addon.label}</span>
                      {addon.price > 0 ? (
                        <span className="vmb-service-preset-card__addon-price">
                          +{formatPrice(addon.price)}
                        </span>
                      ) : null}
                    </label>
                  ) : (
                    <span
                      className={`vmb-service-preset-card__addon${addon.selected ? " vmb-service-preset-card__addon--selected" : ""}`}
                    >
                      <span className="vmb-service-preset-card__addon-label">{addon.label}</span>
                      {addon.price > 0 ? (
                        <span className="vmb-service-preset-card__addon-price">
                          +{formatPrice(addon.price)}
                        </span>
                      ) : null}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {isSalon && participatingTemplates.length > 0 ? (
        <section className="vmb-service-preset-card__participating" aria-label="Participating templates">
          <p className="vmb-service-preset-card__section-label">Participates in</p>
          <div className="vmb-service-preset-card__participating-row">
            {inviteThumbnailUrl ? (
              <div
                className="vmb-service-preset-card__invite-thumb"
                style={{ backgroundImage: `url(${inviteThumbnailUrl})` }}
                aria-hidden
              />
            ) : null}
            <ul className="vmb-service-preset-card__participating-list">
              {participatingTemplates.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {showConfigureFields ? (
        <div className="vmb-service-preset-card__configure">
          {onPriceChange ? (
            <label className="vmb-service-preset-card__field">
              <span>Your price ($)</span>
              <input
                type="number"
                min={0}
                step={1}
                value={Math.round(price / 100)}
                onChange={(e) =>
                  onPriceChange(Math.max(0, Math.round(Number(e.target.value) * 100)))
                }
              />
            </label>
          ) : null}
          {onDurationChange ? (
            <label className="vmb-service-preset-card__field">
              <span>Duration (min)</span>
              <input
                type="number"
                min={15}
                step={15}
                value={durationMinutes}
                onChange={(e) =>
                  onDurationChange(Math.max(15, Number(e.target.value) || 15))
                }
              />
            </label>
          ) : null}
        </div>
      ) : null}

      <footer className="vmb-service-preset-card__footer">
        {isSalon ? (
          <>
            {onConfigure ? (
              <button
                type="button"
                className="vmb-service-preset-card__configure-btn"
                onClick={handleConfigure}
                aria-expanded={configureOpen}
              >
                {configureOpen ? "Hide pricing" : "Configure"}
              </button>
            ) : null}
            {onToggleEnabled ? (
              <button
                type="button"
                className={`vmb-service-preset-card__enable${enabled ? " vmb-service-preset-card__enable--on" : ""}`}
                onClick={onToggleEnabled}
                aria-pressed={enabled}
              >
                {enabled ? "Enabled" : "Enable Service"}
              </button>
            ) : null}
            {onSave ? (
              <button
                type="button"
                className="vmb-service-preset-card__save"
                disabled={saving}
                onClick={onSave}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            ) : null}
          </>
        ) : null}

        {isAdmin ? (
          <>
            {onEditPreset ? (
              <button type="button" className="vmb-service-preset-card__edit" onClick={onEditPreset}>
                Edit Preset
              </button>
            ) : null}
            {onToggleActive ? (
              <label className="vmb-service-preset-card__active-toggle">
                <input type="checkbox" checked={active} onChange={onToggleActive} />
                Active
              </label>
            ) : null}
          </>
        ) : null}

        {isClient && onClaim ? (
          <button type="button" className="vmb-service-preset-card__claim" onClick={onClaim}>
            Claim this offer
          </button>
        ) : null}
      </footer>
    </article>
  );
}
