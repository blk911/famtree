"use client";

import { applyInviteTemplateTokens } from "@/lib/vmb/invite-templates/invite-template-tokens";
import type { InviteTemplateTokenContext } from "@/lib/vmb/invite-templates/invite-template-types";
import type { NailTemplateDraft } from "@/lib/vmb/admin/nail-template-library";

type Props = {
  draft: NailTemplateDraft | null;
  rewardLabels?: string[];
  tokenContext?: InviteTemplateTokenContext;
};

export function AdminTemplatePreviewCard({
  draft,
  rewardLabels = [],
  tokenContext,
}: Props) {
  if (!draft) {
    return (
      <div className="vmb-admin-template-preview">
        <p className="vmb-admin-template-preview__label">Preview</p>
        <p className="vmb-admin-template-preview__empty">Select a template to preview.</p>
      </div>
    );
  }

  const headline = tokenContext
    ? applyInviteTemplateTokens(draft.headline, tokenContext)
    : draft.headline;
  const body = tokenContext ? applyInviteTemplateTokens(draft.body, tokenContext) : draft.body;

  return (
    <div className="vmb-admin-template-preview">
      <p className="vmb-admin-template-preview__label">Preview</p>
      <article className="vmb-admin-nail-invite-card vmb-admin-template-preview__card">
        <p className="vmb-admin-nail-invite-card__eyebrow">{draft.displayName}</p>
        {headline ? <h2 className="vmb-admin-nail-invite-card__headline">{headline}</h2> : null}
        <p className="vmb-admin-nail-invite-card__body">{body}</p>
        {rewardLabels.length > 0 ? (
          <ul className="vmb-admin-offer-preview__chips" aria-label="Rewards included">
            {rewardLabels.map((label) => (
              <li key={label}>
                <span className="vmb-admin-offer-preview__chip">{label}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <footer className="vmb-admin-nail-invite-card__footer">
          <button type="button" className="vmb-admin-nail-invite-card__cta" disabled>
            {draft.ctaLabel}
          </button>
        </footer>
      </article>
    </div>
  );
}
