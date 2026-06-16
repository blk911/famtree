"use client";

import type { CardImageLayout, CardAccent } from "@/lib/vmb/cards/card-types";
import type { CardImageSlot } from "@/lib/vmb/cards/card-preview-model";

type Props = {
  layout: CardImageLayout;
  slots: CardImageSlot[];
  accent: CardAccent;
  tags: string[];
  ownerName?: string;
};

function SlotContent({
  slot,
  large = false,
  ownerName,
}: {
  slot: CardImageSlot;
  large?: boolean;
  ownerName?: string;
}) {
  const isOwner = slot.role === "owner";

  if (slot.previewUrl) {
    return (
      <div className={isOwner ? "vmb-card-preview__owner-wrap" : undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slot.previewUrl}
          alt={slot.label}
          className={`vmb-card-preview__hero-image${isOwner ? " vmb-card-preview__hero-image--owner" : ""}`}
        />
        {isOwner && ownerName ? (
          <span className="vmb-card-preview__owner-caption">from {ownerName}</span>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <span
        className={`vmb-card-preview__placeholder-icon${large ? " vmb-card-preview__placeholder-icon--large" : ""}`}
        aria-hidden
      >
        ✦
      </span>
      {large ? <p className="vmb-card-preview__hero-placeholder-label">Image placeholder</p> : null}
    </>
  );
}

export function CardHero({ layout, slots, accent, tags, ownerName }: Props) {
  if (layout === "collage") {
    const collageSlots =
      slots.length >= 3
        ? slots.slice(0, 3)
        : [
            slots[0] ?? { id: "collage-1", label: "Service image 1", role: "service" as const },
            slots[1] ?? { id: "collage-2", label: "Service image 2", role: "service" as const },
            slots[2] ?? { id: "collage-3", label: "Owner photo", role: "owner" as const },
          ];

    return (
      <div className={`vmb-card-preview__hero vmb-card-preview__hero--collage vmb-card-preview__hero--${accent}`}>
        <div className="vmb-card-preview__collage">
          {collageSlots.map((slot, index) => (
            <div
              key={slot.id}
              className={`vmb-card-preview__collage-cell vmb-card-preview__collage-cell--${index + 1}${slot.role === "owner" ? " vmb-card-preview__collage-cell--owner" : ""}`}
              aria-label={slot.label}
            >
              <SlotContent slot={slot} ownerName={ownerName} />
            </div>
          ))}
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
              className={`vmb-card-preview__dual-cell${slot.role === "owner" ? " vmb-card-preview__dual-cell--owner" : ""}`}
              aria-label={slot.label}
            >
              <SlotContent slot={slot} ownerName={ownerName} />
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
        className={`vmb-card-preview__hero-single${primary.role === "owner" ? " vmb-card-preview__hero-single--owner" : ""}`}
        aria-label={primary.label}
      >
        <SlotContent slot={primary} large ownerName={ownerName} />
      </div>
      {tags[0] ? <span className="vmb-card-preview__hero-tag">{tags[0]}</span> : null}
    </div>
  );
}
