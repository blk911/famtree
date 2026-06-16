"use client";

import type { CardImageLayout, CardAccent } from "@/lib/vmb/cards/card-types";
import type { CardImageSlot } from "@/lib/vmb/cards/card-preview-model";
import { buildOwnerPreviewCaption } from "@/lib/vmb/cards/card-owner-preview-copy";

type Props = {
  layout: CardImageLayout;
  slots: CardImageSlot[];
  accent: CardAccent;
  tags: string[];
  ownerName?: string;
};

function ServiceImageTile({
  slot,
  large = false,
}: {
  slot: CardImageSlot;
  large?: boolean;
}) {
  if (slot.previewUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={slot.previewUrl} alt={slot.label} className="vmb-card-preview__service-image" />
    );
  }

  return (
    <div className="vmb-card-preview__service-placeholder">
      <span
        className={`vmb-card-preview__placeholder-icon${large ? " vmb-card-preview__placeholder-icon--large" : ""}`}
        aria-hidden
      >
        ✦
      </span>
      {large ? <p className="vmb-card-preview__hero-placeholder-label">Service image</p> : null}
    </div>
  );
}

function OwnerIdentityPanel({
  slot,
  ownerName,
}: {
  slot: CardImageSlot;
  ownerName?: string;
}) {
  const caption = buildOwnerPreviewCaption(ownerName);

  if (slot.previewUrl) {
    return (
      <div className="vmb-card-preview__owner-identity">
        <div className="vmb-card-preview__owner-avatar-ring">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slot.previewUrl} alt={slot.label} className="vmb-card-preview__owner-avatar" />
        </div>
        {caption ? <p className="vmb-card-preview__owner-caption">{caption}</p> : null}
      </div>
    );
  }

  return (
    <div className="vmb-card-preview__owner-identity vmb-card-preview__owner-identity--empty">
      <div className="vmb-card-preview__owner-placeholder-ring" aria-hidden>
        <span className="vmb-card-preview__placeholder-icon">✦</span>
      </div>
      {caption ? (
        <p className="vmb-card-preview__owner-caption vmb-card-preview__owner-caption--muted">{caption}</p>
      ) : (
        <p className="vmb-card-preview__owner-caption vmb-card-preview__owner-caption--muted">Owner photo</p>
      )}
    </div>
  );
}

function renderSlotContent(slot: CardImageSlot, ownerName: string | undefined, large = false) {
  if (slot.role === "owner") {
    return <OwnerIdentityPanel slot={slot} ownerName={ownerName} />;
  }
  return <ServiceImageTile slot={slot} large={large} />;
}

export function CardHero({ layout, slots, accent, tags, ownerName }: Props) {
  if (layout === "collage") {
    const serviceOne = slots[0] ?? { id: "collage-1", label: "Service image 1", role: "service" as const };
    const serviceTwo = slots[1] ?? { id: "collage-2", label: "Service image 2", role: "service" as const };
    const ownerSlot = slots[2] ?? { id: "collage-3", label: "Owner photo", role: "owner" as const };

    return (
      <div className={`vmb-card-preview__hero vmb-card-preview__hero--collage vmb-card-preview__hero--${accent}`}>
        <div className="vmb-card-preview__collage vmb-card-preview__collage--split">
          <div
            className="vmb-card-preview__collage-cell vmb-card-preview__collage-cell--service vmb-card-preview__collage-cell--1"
            aria-label={serviceOne.label}
          >
            <ServiceImageTile slot={serviceOne} />
          </div>
          <div
            className="vmb-card-preview__collage-cell vmb-card-preview__collage-cell--service vmb-card-preview__collage-cell--2"
            aria-label={serviceTwo.label}
          >
            <ServiceImageTile slot={serviceTwo} />
          </div>
          <div
            className="vmb-card-preview__collage-cell vmb-card-preview__collage-cell--owner vmb-card-preview__collage-cell--3"
            aria-label={ownerSlot.label}
          >
            <OwnerIdentityPanel slot={ownerSlot} ownerName={ownerName} />
          </div>
        </div>
        {tags[0] ? <span className="vmb-card-preview__hero-tag">{tags[0]}</span> : null}
      </div>
    );
  }

  if (layout === "dual") {
    return (
      <div className={`vmb-card-preview__hero vmb-card-preview__hero--dual vmb-card-preview__hero--${accent}`}>
        <div className="vmb-card-preview__dual">
          {slots.slice(0, 2).map((slot) => (
            <div
              key={slot.id}
              className={`vmb-card-preview__dual-cell${slot.role === "owner" ? " vmb-card-preview__dual-cell--owner" : " vmb-card-preview__dual-cell--service"}`}
              aria-label={slot.label}
            >
              {renderSlotContent(slot, ownerName)}
            </div>
          ))}
        </div>
        {tags[0] ? <span className="vmb-card-preview__hero-tag">{tags[0]}</span> : null}
      </div>
    );
  }

  const primary = slots[0] ?? { id: "hero", label: "Hero image", role: "service" as const };

  return (
    <div className={`vmb-card-preview__hero vmb-card-preview__hero--single vmb-card-preview__hero--${accent}`}>
      <div
        className={`vmb-card-preview__hero-single${primary.role === "owner" ? " vmb-card-preview__hero-single--owner" : " vmb-card-preview__hero-single--service"}`}
        aria-label={primary.label}
      >
        {renderSlotContent(primary, ownerName, true)}
      </div>
      {tags[0] ? <span className="vmb-card-preview__hero-tag">{tags[0]}</span> : null}
    </div>
  );
}
