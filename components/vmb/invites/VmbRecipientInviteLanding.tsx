"use client";

import Link from "next/link";
import { CardHero } from "@/components/vmb/cards/CardHero";
import type { CardPreviewModel } from "@/lib/vmb/cards/card-preview-model";
import { resolveOwnerPhotoFromPreviewSlots } from "@/lib/vmb/card-templates/card-builder-preview-images";
import { ownerPreviewInitial } from "@/lib/vmb/cards/card-owner-preview-copy";
import {
  buildPersonalInviteCopy,
  buildPrivateNoteLine,
} from "@/lib/vmb/cards/personal-invite-copy";
import type { RecipientInvitePageState } from "@/lib/vmb/invites/recipient-invite-view";

type Props = {
  state: RecipientInvitePageState;
};

const BENEFITS = [
  "Luxury Experience",
  "Personalized Just For You",
  "Premium Quality",
  "Memorable Results",
] as const;

function firstName(name?: string): string {
  return name?.trim().split(/\s+/)[0] || "there";
}

function salonInitials(name?: string): string {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const initials = words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");
  return initials || "V";
}

function stripValidPrefix(label?: string): string {
  return label?.replace(/^Valid\s+/i, "").trim() || "this invitation window";
}

function offerDetails(model: CardPreviewModel) {
  const service = model.offer?.serviceName || model.metadata.serviceName || model.offer?.offerText || "Your salon gift";
  const upgrades = [model.offer?.upgradeName].filter((item): item is string => Boolean(item?.trim()));
  const expiration = model.offer?.terms || model.templateOfferLine || "Valid for your private invite window";
  return { service, upgrades, expiration };
}

function unavailableCopy(state: Extract<RecipientInvitePageState, { status: "expired" | "not_found" }>) {
  if (state.status === "expired") {
    return {
      eyebrow: "Invitation closed",
      title: "This private invite is no longer active",
      body: state.message,
    };
  }
  return {
    eyebrow: "Invitation unavailable",
    title: "We couldn't find this invite",
    body: "The link may be incorrect or the invite may have been removed. Contact your salon if you believe this is a mistake.",
  };
}

export function VmbRecipientInviteLanding({ state }: Props) {
  if (state.status !== "available") {
    const copy = unavailableCopy(state);
    return (
      <main className="vmb-public-invite vmb-public-invite--centered">
        <section className="vmb-public-invite__unavailable">
          <p className="vmb-public-invite__eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p>{copy.body}</p>
        </section>
      </main>
    );
  }

  const { view } = state;
  const model = view.previewModel;
  const copy =
    model.inviteCopy ??
    buildPersonalInviteCopy({
      recipientName: model.metadata.recipientName,
      serviceName: model.metadata.serviceName,
      lastVisit: model.metadata.lastVisit,
      ticketValue: model.metadata.ticketValue,
      techName: model.techName,
      salonName: model.salonDisplayName,
    });
  const clientFirstName = firstName(model.metadata.recipientName);
  const salonName = view.salonDisplayName || model.salonDisplayName || "Your Salon";
  const techName = view.techName || model.techName || "Your nail tech";
  const inviteType = model.templateName || model.title || buildPrivateNoteLine(model.metadata.recipientName);
  const offer = offerDetails(model);
  const ownerPhotoUrl = resolveOwnerPhotoFromPreviewSlots(model.imageSlots);
  const ownerInitial = ownerPreviewInitial(techName) || salonInitials(salonName);
  const headlineParts = model.title.split(/\s+(?=[^ ]+$)/);
  const headlineMain = headlineParts.length > 1 ? headlineParts.slice(0, -1).join(" ") : model.title;
  const headlineScript = headlineParts.length > 1 ? headlineParts.at(-1) : "just for you";

  return (
    <main className="vmb-public-invite">
      <nav className="vmb-public-invite__topbar" aria-label="Invitation">
        <div className="vmb-public-invite__brand">
          <strong>VMB</strong>
          <span>Client Invite</span>
        </div>
        <div className="vmb-public-invite__identity-pill">
          <span className="vmb-public-invite__identity-avatar" aria-hidden>
            {ownerPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ownerPhotoUrl} alt="" />
            ) : (
              ownerInitial
            )}
          </span>
          <span>
            <strong>Your nail tech · {salonName}</strong>
            <small>{inviteType}</small>
          </span>
        </div>
      </nav>

      <section className="vmb-public-invite__panel">
        <div className="vmb-public-invite__grid">
          <div className="vmb-public-invite__left">
            <section className="vmb-public-invite__private-card">
              <div className="vmb-public-invite__private-copy">
                <p className="vmb-public-invite__eyebrow">Private Invitation</p>
                <p className="vmb-public-invite__script">Hi</p>
                <h1>{clientFirstName}</h1>
                <p>
                  You're personally invited by {salonName} to enjoy something beautiful, curated just for you.
                </p>
              </div>
              <dl className="vmb-public-invite__detail-list">
                <div>
                  <dt><span aria-hidden>✦</span> Invite</dt>
                  <dd>{inviteType}</dd>
                </div>
                <div>
                  <dt><span aria-hidden>◌</span> Salon</dt>
                  <dd>{salonName}</dd>
                </div>
                <div>
                  <dt><span aria-hidden>♡</span> Good Through</dt>
                  <dd>{stripValidPrefix(offer.expiration)}</dd>
                </div>
              </dl>
            </section>

            <section className="vmb-public-invite__gift-card">
              <div>
                <p className="vmb-public-invite__eyebrow">Your Private Invite</p>
                <h2>{model.title}</h2>
                <p>Claim your invite, ask for a small adjustment, or hold it while you decide.</p>
              </div>
              <div className="vmb-public-invite__service-mini">
                <strong>{offer.service}</strong>
                {offer.upgrades.length > 0 ? (
                  <ul>
                    {offer.upgrades.map((upgrade) => (
                      <li key={upgrade}>{upgrade}</li>
                    ))}
                  </ul>
                ) : (
                  <span>Curated by your salon</span>
                )}
              </div>
              <div className="vmb-public-invite__cta-row">
                <Link href={view.claimHref} className="vmb-public-invite__cta vmb-public-invite__cta--primary">
                  Claim My Gift
                </Link>
                <button type="button" className="vmb-public-invite__cta vmb-public-invite__cta--secondary">
                  Revise
                </button>
                <button type="button" className="vmb-public-invite__cta vmb-public-invite__cta--tertiary">
                  Hold for Now
                </button>
              </div>
            </section>
          </div>

          <aside className="vmb-public-invite__preview-card" aria-label="Luxury invitation card">
            <div className="vmb-public-invite__preview-hero">
              <CardHero
                layout={model.imageLayout}
                slots={model.imageSlots}
                accent={model.accent}
                tags={model.tags}
                ownerName={techName}
              />
            </div>
            <div className="vmb-public-invite__crest" aria-hidden>
              {ownerPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ownerPhotoUrl} alt="" />
              ) : (
                salonInitials(salonName)
              )}
            </div>
            <div className="vmb-public-invite__preview-body">
              <h2>
                <span>{headlineMain}</span>
                <em>{headlineScript}</em>
              </h2>
              <p>{copy.inviteMessage || model.body}</p>
              <section className="vmb-public-invite__exclusive-box" aria-label="Your exclusive gift">
                <p>Your Exclusive Gift</p>
                <strong>{offer.service}</strong>
                {offer.upgrades.length > 0 ? (
                  <ul>
                    {offer.upgrades.map((upgrade) => (
                      <li key={upgrade}>{upgrade}</li>
                    ))}
                  </ul>
                ) : null}
                <span>{stripValidPrefix(offer.expiration)}</span>
              </section>
              <Link href={view.claimHref} className="vmb-public-invite__preview-cta">
                Claim My Gift
              </Link>
            </div>
          </aside>
        </div>

        <footer className="vmb-public-invite__trust-strip">
          <ul>
            {BENEFITS.map((benefit) => (
              <li key={benefit}>
                <span aria-hidden>✧</span>
                {benefit}
              </li>
            ))}
          </ul>
          <p>Thank you for being part of our salon family.</p>
        </footer>
      </section>
    </main>
  );
}
