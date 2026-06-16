"use client";

import { CardPreviewOfferBlock } from "@/components/vmb/cards/CardPreviewOfferBlock";
import type { CardPreviewModel } from "@/lib/vmb/cards/card-preview-model";
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

  return (
    <article className="vmb-salon-invite" data-card-type={model.cardType}>
      <div className="vmb-salon-invite__band">
        <div className="vmb-salon-invite__avatar" aria-hidden>
          <span className="vmb-salon-invite__avatar-inner" />
        </div>
        <div className="vmb-salon-invite__band-copy">
          <p className="vmb-salon-invite__tech">{techLine}</p>
          <p className="vmb-salon-invite__private-note">{privateNote}</p>
        </div>
      </div>

      <div className="vmb-salon-invite__hero" aria-hidden>
        <div className="vmb-salon-invite__hero-gradient" />
        <div className="vmb-salon-invite__collage">
          <span className="vmb-salon-invite__collage-tile vmb-salon-invite__collage-tile--1" />
          <span className="vmb-salon-invite__collage-tile vmb-salon-invite__collage-tile--2" />
          <span className="vmb-salon-invite__collage-tile vmb-salon-invite__collage-tile--3" />
        </div>
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
