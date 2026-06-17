"use client";

import type {
  InviteTemplateRenderOffer,
  InviteTemplateRenderPayload,
} from "@/lib/vmb/invite-templates/invite-template-types";

export type InviteTemplateRenderCardProps = {
  payload: InviteTemplateRenderPayload;
  mode: "adminPreview" | "salon" | "client";
  onCtaClick?: () => void;
};

export function InviteTemplateRenderCard({
  payload,
  mode,
  onCtaClick,
}: InviteTemplateRenderCardProps) {
  const isClient = mode === "client";

  return (
    <article
      className={`vmb-invite-render-card vmb-invite-render-card--${mode}`}
      aria-label={`${payload.inviteTypeLabel} invite`}
    >
      <header className="vmb-invite-render-card__meta">
        <span className="vmb-invite-render-card__category">{payload.categoryLabel}</span>
        <span className="vmb-invite-render-card__type">{payload.inviteTypeLabel}</span>
      </header>

      <div className="vmb-invite-render-card__invite">
        <p className="vmb-invite-render-card__eyebrow">{payload.eyebrow}</p>
        <h2 className="vmb-invite-render-card__headline">{payload.headline}</h2>
        <p className="vmb-invite-render-card__body">{payload.body}</p>
      </div>

      <section className="vmb-invite-render-card__offer" aria-label="Offer">
        {payload.offer ? (
          <OfferBlock offer={payload.offer} />
        ) : (
          <p className="vmb-invite-render-card__offer-empty">
            No offer selected yet.
            {mode === "adminPreview" ? " Salon will attach an offer before sending." : null}
          </p>
        )}
      </section>

      <footer className="vmb-invite-render-card__footer">
        <button
          type="button"
          className="vmb-invite-render-card__cta"
          onClick={onCtaClick}
          disabled={!onCtaClick && isClient}
        >
          {payload.ctaLabel}
        </button>
      </footer>
    </article>
  );
}

function OfferBlock({ offer }: { offer: InviteTemplateRenderOffer }) {
  return (
    <div className="vmb-invite-render-card__offer-card">
      <p className="vmb-invite-render-card__offer-name">{offer.name}</p>
      {offer.description ? (
        <p className="vmb-invite-render-card__offer-desc">{offer.description}</p>
      ) : null}
      <p className="vmb-invite-render-card__offer-service">Includes: {offer.serviceName}</p>
      {offer.addonLabels.length > 0 ? (
        <ul className="vmb-invite-render-card__offer-addons">
          {offer.addonLabels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      ) : null}
      <p className="vmb-invite-render-card__offer-price">{offer.priceLabel}</p>
    </div>
  );
}
