"use client";

import { CardHero } from "@/components/vmb/cards/CardHero";
import { CardPreviewOfferBlock } from "@/components/vmb/cards/CardPreviewOfferBlock";
import type { CardPreviewModel } from "@/lib/vmb/cards/card-preview-model";
import { resolveOwnerPhotoFromPreviewSlots } from "@/lib/vmb/card-templates/card-builder-preview-images";
import { ownerPreviewInitial } from "@/lib/vmb/cards/card-owner-preview-copy";
import {
  buildPersonalInviteCopy,
  buildPrivateNoteLine,
  buildTechIdentityLine,
} from "@/lib/vmb/cards/personal-invite-copy";

type Props = {
  model: CardPreviewModel;
};

export function PersonalInvitePreview({ model }: Props) {
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

  const techLine = buildTechIdentityLine({
    techName: model.techName,
    salonName: model.salonDisplayName,
  });
  const privateNote = buildPrivateNoteLine(model.metadata.recipientName);
  const ownerPhotoUrl = resolveOwnerPhotoFromPreviewSlots(model.imageSlots);
  const ownerInitial = ownerPreviewInitial(model.techName);

  return (
    <article className="vmb-salon-invite" data-card-type={model.cardType}>
      <div className="vmb-salon-invite__band">
        <div
          className={`vmb-salon-invite__avatar${ownerPhotoUrl ? "" : " vmb-salon-invite__avatar--empty"}`}
          aria-hidden
        >
          {ownerPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ownerPhotoUrl} alt="" className="vmb-salon-invite__avatar-photo" />
          ) : ownerInitial ? (
            <span className="vmb-salon-invite__avatar-initial">{ownerInitial}</span>
          ) : (
            <span className="vmb-salon-invite__avatar-mark" aria-hidden>
              ✦
            </span>
          )}
        </div>
        <div className="vmb-salon-invite__band-copy">
          <p className="vmb-salon-invite__tech">{techLine}</p>
          <p className="vmb-salon-invite__private-note">{privateNote}</p>
        </div>
      </div>

      <div className="vmb-salon-invite__hero">
        <CardHero
          layout={model.imageLayout}
          slots={model.imageSlots}
          accent={model.accent}
          tags={model.tags}
          ownerName={model.techName}
        />
      </div>

      <div className="vmb-salon-invite__content">
        <p className="vmb-salon-invite__greeting">{copy.greeting}</p>
        <p className="vmb-salon-invite__paragraph">{copy.personalConnection}</p>
        <p className="vmb-salon-invite__paragraph">{copy.inviteMessage}</p>
        {copy.offerMessage.trim() ? (
          <p className="vmb-salon-invite__paragraph vmb-salon-invite__paragraph--offer">
            {copy.offerMessage}
          </p>
        ) : null}
        {model.includeOffer !== false && model.offer ? (
          <CardPreviewOfferBlock model={model} />
        ) : null}
        <p className="vmb-salon-invite__signature">{copy.signature}</p>
        <div className="vmb-salon-invite__cta-row">
          <span className="vmb-salon-invite__cta vmb-salon-invite__cta--primary">
            {model.cta || copy.primaryCta}
          </span>
        </div>
      </div>
    </article>
  );
}
