"use client";

import {
  ADMIN_INVITE_RENDER_DEBUG_STYLE,
  debugPreview160,
  resolveAdminNailInviteCardContent,
  type AdminNailInviteCardOffer,
  type AdminNailInviteCardTemplate,
} from "@/lib/vmb/invite-templates/admin-nail-invite-card-content";
import type { InviteTemplateTokenContext } from "@/lib/vmb/invite-templates/invite-template-types";

export type AdminNailInviteCardProps = {
  template: AdminNailInviteCardTemplate;
  tokenContext?: InviteTemplateTokenContext;
  offer?: AdminNailInviteCardOffer;
};

export function AdminNailInviteCard({ template, tokenContext, offer }: AdminNailInviteCardProps) {
  const content = resolveAdminNailInviteCardContent(template, tokenContext);

  return (
    <article
      className="vmb-admin-nail-invite-card"
      aria-label={`${template.displayName} admin invite card`}
      data-template-id={template.id}
    >
      <div style={ADMIN_INVITE_RENDER_DEBUG_STYLE} data-testid="admin-nail-invite-card-props-debug">
        <strong>CARD PROPS DEBUG (always visible)</strong>
        {"\n"}template.id: {template.id}
        {"\n"}headline: {template.headline}
        {"\n"}ctaLabel: {template.ctaLabel}
        {"\n"}body: {debugPreview160(template.body)}
      </div>

      <header className="vmb-admin-nail-invite-card__meta">
        <span className="vmb-admin-nail-invite-card__type">{template.displayName}</span>
      </header>

      <div className="vmb-admin-nail-invite-card__invite">
        {content.eyebrow ? (
          <p className="vmb-admin-nail-invite-card__eyebrow">{content.eyebrow}</p>
        ) : null}
        {content.headline ? (
          <h2 className="vmb-admin-nail-invite-card__headline">{content.headline}</h2>
        ) : null}
        <p className="vmb-admin-nail-invite-card__body">{content.body}</p>
      </div>

      {offer ? (
        <section className="vmb-admin-nail-invite-card__offer" aria-label="Offer">
          <div className="vmb-admin-nail-invite-card__offer-card">
            <p className="vmb-admin-nail-invite-card__offer-name">{offer.name}</p>
            {offer.description ? (
              <p className="vmb-admin-nail-invite-card__offer-desc">{offer.description}</p>
            ) : null}
            {offer.serviceName ? (
              <p className="vmb-admin-nail-invite-card__offer-service">Includes: {offer.serviceName}</p>
            ) : null}
            {offer.addonLabels && offer.addonLabels.length > 0 ? (
              <ul className="vmb-admin-nail-invite-card__offer-addons">
                {offer.addonLabels.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            ) : null}
            {offer.price ? (
              <p className="vmb-admin-nail-invite-card__offer-price">{offer.price}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      <footer className="vmb-admin-nail-invite-card__footer">
        <button type="button" className="vmb-admin-nail-invite-card__cta" disabled>
          {content.ctaLabel}
        </button>
      </footer>
    </article>
  );
}
