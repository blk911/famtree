"use client";

function formatPrice(cents: number): string {
  return `$${Math.max(0, Math.round(cents / 100)).toLocaleString()}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`;
}

type Props = {
  name: string;
  description: string;
  priceCents: number;
  durationMinutes: number;
  enabled: boolean;
  selected: boolean;
  onSelect: () => void;
};

export function SalonServiceListItem({
  name,
  description,
  priceCents,
  durationMinutes,
  enabled,
  selected,
  onSelect,
}: Props) {
  return (
    <li className={`vmb-salon-services__list-item${selected ? " vmb-salon-services__list-item--selected" : ""}`}>
      <button type="button" className="vmb-salon-services__list-button" onClick={onSelect}>
        <div className="vmb-salon-services__list-head">
          <h3 className="vmb-salon-services__list-name">{name}</h3>
          <span
            className={`vmb-salon-services__status-badge${enabled ? " vmb-salon-services__status-badge--enabled" : ""}`}
          >
            {enabled ? "Enabled" : "Disabled"}
          </span>
        </div>
        {description ? <p className="vmb-salon-services__list-desc">{description}</p> : null}
        <p className="vmb-salon-services__list-meta">
          {formatPrice(priceCents)} · {formatDuration(durationMinutes)}
        </p>
        <span className="vmb-salon-services__list-action">{selected ? "Selected" : "Configure"}</span>
      </button>
    </li>
  );
}

export { formatDuration, formatPrice };
