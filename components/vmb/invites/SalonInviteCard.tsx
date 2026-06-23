"use client";

import { useEffect, useState } from "react";
import { ownerPreviewInitial } from "@/lib/vmb/cards/card-owner-preview-copy";
import { getFallbackServiceAsset } from "@/lib/vmb/assets/service-photo-library";
import {
  INVITE_TEMPLATE_PREVIEW_CONTEXT,
  applyInviteTemplateTokens,
} from "@/lib/vmb/invite-templates/invite-template-tokens";
import type { InviteTemplateTokenContext } from "@/lib/vmb/invite-templates/invite-template-types";

export type SalonInviteCardMode = "adminReview" | "salon" | "client";

export type SalonInviteCardProps = {
  inviteTypeLabel: string;
  headline: string;
  body: string;
  ctaLabel: string;
  services: readonly string[];
  rewards: readonly string[];
  expirationLabel?: string;
  ownerName: string;
  ownerPhotoUrl?: string;
  salonName?: string;
  salonLogoUrl?: string;
  serviceImageUrl?: string;
  inviteArtImageUrl?: string;
  mode: SalonInviteCardMode;
  previewOnly?: boolean;
  /** Token context override — defaults to preview client name in adminReview. */
  tokenContext?: InviteTemplateTokenContext;
};

export function SalonInviteCard({
  inviteTypeLabel,
  headline,
  body,
  ctaLabel,
  services,
  rewards,
  expirationLabel,
  ownerName,
  ownerPhotoUrl,
  salonName,
  salonLogoUrl,
  serviceImageUrl,
  inviteArtImageUrl,
  mode,
  previewOnly = false,
  tokenContext,
}: SalonInviteCardProps) {
  const tokens: InviteTemplateTokenContext = {
    ...INVITE_TEMPLATE_PREVIEW_CONTEXT,
    ...tokenContext,
    salonName: salonName?.trim() || tokenContext?.salonName || INVITE_TEMPLATE_PREVIEW_CONTEXT.salonName,
    providerName: ownerName.trim() || tokenContext?.providerName || INVITE_TEMPLATE_PREVIEW_CONTEXT.providerName,
  };

  const resolvedHeadline = applyInviteTemplateTokens(headline, tokens);
  const resolvedBody = applyInviteTemplateTokens(body, tokens);
  const resolvedCta = applyInviteTemplateTokens(ctaLabel, tokens);
  const ownerInitial = ownerPreviewInitial(ownerName);
  const identityLine = [ownerName.trim(), salonName?.trim()].filter(Boolean).join(" · ");
  const fallbackServiceImageUrl = getFallbackServiceAsset().imageUrl;
  const heroImageUrl = inviteArtImageUrl?.trim() || serviceImageUrl?.trim() || fallbackServiceImageUrl;
  const [resolvedServiceImageUrl, setResolvedServiceImageUrl] = useState(heroImageUrl);

  useEffect(() => {
    setResolvedServiceImageUrl(heroImageUrl);
  }, [heroImageUrl]);

  return (
    <article
      className={`vmb-salon-invite-card vmb-salon-invite-card--${mode}`}
      aria-label={`${inviteTypeLabel} invitation`}
    >
      <header className="vmb-salon-invite-card__header">
        <div className="vmb-salon-invite-card__identity">
          <div
            className={`vmb-salon-invite-card__owner-photo${ownerPhotoUrl ? "" : " vmb-salon-invite-card__owner-photo--empty"}`}
          >
            {ownerPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ownerPhotoUrl} alt="" className="vmb-salon-invite-card__owner-photo-img" />
            ) : ownerInitial ? (
              <span className="vmb-salon-invite-card__owner-initial">{ownerInitial}</span>
            ) : (
              <span className="vmb-salon-invite-card__owner-mark" aria-hidden>
                ✦
              </span>
            )}
          </div>
          <div className="vmb-salon-invite-card__identity-copy">
            {identityLine ? <p className="vmb-salon-invite-card__owner-line">{identityLine}</p> : null}
            <p className="vmb-salon-invite-card__invite-type">{inviteTypeLabel}</p>
          </div>
        </div>
        {salonLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={salonLogoUrl} alt="" className="vmb-salon-invite-card__salon-logo" />
        ) : null}
      </header>

      <div className="vmb-salon-invite-card__service-image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolvedServiceImageUrl}
          alt=""
          className="vmb-salon-invite-card__service-image-img"
          onError={() => {
            if (resolvedServiceImageUrl !== fallbackServiceImageUrl) {
              setResolvedServiceImageUrl(fallbackServiceImageUrl);
            }
          }}
        />
      </div>

      <div className="vmb-salon-invite-card__content">
        {resolvedHeadline ? (
          <h2 className="vmb-salon-invite-card__headline">{resolvedHeadline}</h2>
        ) : null}
        <p className="vmb-salon-invite-card__body">{resolvedBody}</p>

        {services.length > 0 || rewards.length > 0 || expirationLabel?.trim() ? (
          <section className="vmb-salon-invite-card__offer" aria-label="Invitation offer">
            {services.length > 0 ? (
              <div className="vmb-salon-invite-card__offer-row">
                <span className="vmb-salon-invite-card__offer-label">Your service</span>
                <strong className="vmb-salon-invite-card__service-feature">{services.join(" · ")}</strong>
              </div>
            ) : null}

            {rewards.length > 0 ? (
              <div className="vmb-salon-invite-card__offer-row">
                <span className="vmb-salon-invite-card__offer-label">Level up with:</span>
                <ul className="vmb-salon-invite-card__rewards" aria-label="Level up with">
                  {rewards.map((label) => (
                    <li key={label}>
                      <span className="vmb-salon-invite-card__reward-chip">{label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {expirationLabel?.trim() ? (
              <p className="vmb-salon-invite-card__expiration">{expirationLabel.trim()}</p>
            ) : null}
          </section>
        ) : null}

        <footer className="vmb-salon-invite-card__footer">
          <button
            type="button"
            className={`vmb-salon-invite-card__cta${previewOnly ? " vmb-salon-invite-card__cta--preview" : ""}`}
            disabled={mode === "adminReview" || previewOnly}
          >
            {previewOnly ? "Client CTA Preview" : resolvedCta}
          </button>
        </footer>
      </div>
    </article>
  );
}
