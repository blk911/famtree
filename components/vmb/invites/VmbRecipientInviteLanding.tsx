"use client";

import { CardHero } from "@/components/vmb/cards/CardHero";
import { InvitationEnvelope } from "@/components/vmb/invites/InvitationEnvelope";
import type { CardPreviewModel } from "@/lib/vmb/cards/card-preview-model";
import { resolveOwnerPhotoFromPreviewSlots } from "@/lib/vmb/card-templates/card-builder-preview-images";
import { ownerPreviewInitial } from "@/lib/vmb/cards/card-owner-preview-copy";
import type { RecipientInvitePageState } from "@/lib/vmb/invites/recipient-invite-view";

type Props = {
  state: RecipientInvitePageState;
};

function firstName(name?: string): string {
  return name?.trim().split(/\s+/)[0] || "there";
}

function salonInitials(name?: string): string {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const initials = words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");
  return initials || "V";
}

function stripValidPrefix(label?: string): string {
  return label?.replace(/^Valid\s+/i, "").trim() || "your private invite window";
}

function offerDetails(model: CardPreviewModel) {
  const tags = model.tags.map((tag) => tag.trim()).filter(Boolean);
  const service =
    model.offer?.serviceName ||
    model.metadata.serviceName ||
    tags[0] ||
    model.offer?.offerText ||
    "Your salon gift";
  const upgrades = Array.from(
    new Set(
      [model.offer?.upgradeName, ...tags.filter((tag) => tag !== service)]
        .filter((item): item is string => Boolean(item?.trim())),
    ),
  );
  const expiration = model.offer?.terms || model.relationshipBenefit || "Valid for your private invite window";
  return { service, upgrades, expiration };
}

function offerLine(service: string, upgrades: string[], expiration: string): string {
  const upgradeText = upgrades.length > 0 ? ` with ${upgrades.join(" and ")}` : "";
  return `Your ${service}${upgradeText} special is available now or held ${stripValidPrefix(expiration)}.`;
}

function birthdayNote(clientFirstName: string, salonName: string, inviteTitle: string, inviteType?: string): string {
  const text = `${inviteTitle} ${inviteType ?? ""}`.toLowerCase();
  if (text.includes("birthday")) {
    return `Happy Birthday, ${clientFirstName}. ${salonName} created something special for your birthday month.`;
  }
  return `You are personally invited by ${salonName} to enjoy something beautiful, curated just for you.`;
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
  const clientFirstName = firstName(model.metadata.recipientName);
  const salonName = view.salonDisplayName || model.salonDisplayName || "Your Salon";
  const techName = view.techName || model.techName || "Your nail tech";
  const inviteTitle = model.title || "Your private salon gift";
  const inviteType = model.subtitle || model.templateName || "Private Invite";
  const offer = offerDetails(model);
  const ownerPhotoUrl = resolveOwnerPhotoFromPreviewSlots(model.imageSlots);
  const ownerInitial = ownerPreviewInitial(techName) || salonInitials(salonName);
  const personalNote = birthdayNote(clientFirstName, salonName, inviteTitle, inviteType);

  return (
    <main className="vmb-public-invite">
      <nav className="vmb-public-invite__topbar" aria-label="Invitation">
        <div className="vmb-public-invite__brand">
          <strong>VMB</strong>
          <span>Client Invite</span>
        </div>
        <div className="vmb-public-invite__identity-pill">
          <span className="vmb-public-invite__identity-avatar" aria-hidden="true">
            {ownerPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ownerPhotoUrl} alt="" />
            ) : (
              ownerInitial
            )}
          </span>
          <span>
            <strong>{techName} · {salonName}</strong>
            <small>{inviteType}</small>
          </span>
        </div>
      </nav>

      <InvitationEnvelope clientFirstName={clientFirstName} salonName={salonName} inviteTitle={inviteTitle}>
        <article className="vmb-public-invite__card" aria-label="Private salon invitation">
          <div className="vmb-public-invite__card-top">
            <div className="vmb-public-invite__hero">
              <CardHero
                layout={model.imageLayout}
                slots={model.imageSlots}
                accent={model.accent}
                tags={model.tags}
                ownerName={techName}
              />
            </div>

            <div className="vmb-public-invite__body">
              <div className="vmb-public-invite__crest" aria-hidden>
                {ownerPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ownerPhotoUrl} alt="" />
                ) : (
                  ownerInitial
                )}
              </div>
              <p className="vmb-public-invite__eyebrow">Private Invitation</p>
              <p className="vmb-public-invite__hello">Hi {clientFirstName}</p>
              <h1>{inviteTitle}</h1>
              <p className="vmb-public-invite__note">{personalNote}</p>
              {model.body ? <p className="vmb-public-invite__letter">{model.body}</p> : null}
            </div>
          </div>

          <div className="vmb-public-invite__card-bottom">
            <section className="vmb-public-invite__gift" aria-label="Your gift details">
              <p className="vmb-public-invite__gift-label">A note about your gift</p>
              <strong className="vmb-public-invite__gift-service">{offer.service}</strong>
              <p className="vmb-public-invite__gift-note">
                {offerLine(offer.service, offer.upgrades, offer.expiration)}
              </p>
              {offer.upgrades.length > 0 ? (
                <ul className="vmb-public-invite__gift-chips" aria-label="Included level ups">
                  {offer.upgrades.map((upgrade) => (
                    <li key={upgrade}>{upgrade}</li>
                  ))}
                </ul>
              ) : null}
              <div className="vmb-public-invite__valid">
                <span>Good Through</span>
                <strong>{stripValidPrefix(offer.expiration)}</strong>
              </div>
            </section>

            <a href={view.claimHref} className="vmb-public-invite__open-gift-link">
              Open My Birthday Gift
            </a>
          </div>

          <p className="vmb-public-invite__closing">With love, {salonName}</p>
        </article>
      </InvitationEnvelope>
    </main>
  );
}
