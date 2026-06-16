"use client";

import type { CardImageLayout, CardAccent } from "@/lib/vmb/cards/card-types";
import type { CardImageSlot } from "@/lib/vmb/cards/card-preview-model";

type Props = {
  layout: CardImageLayout;
  slots: CardImageSlot[];
  accent: CardAccent;
  tags: string[];
};

function SlotContent({ slot, large = false }: { slot: CardImageSlot; large?: boolean }) {
  if (slot.previewUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={slot.previewUrl}
        alt={slot.label}
        className="vmb-card-preview__hero-image"
      />
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

export function CardHero({ layout, slots, accent, tags }: Props) {
  if (layout === "collage") {
    return (
      <div className={`vmb-card-preview__hero vmb-card-preview__hero--collage vmb-card-preview__hero--${accent}`}>
        <div className="vmb-card-preview__collage">
          {slots.slice(0, 3).map((slot, index) => (
            <div
              key={slot.id}
              className={`vmb-card-preview__collage-cell vmb-card-preview__collage-cell--${index + 1}`}
              aria-label={slot.label}
            >
              <SlotContent slot={slot} />
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
            <div key={slot.id} className="vmb-card-preview__dual-cell" aria-label={slot.label}>
              <SlotContent slot={slot} />
            </div>
          ))}
        </div>
        {tags[0] ? <span className="vmb-card-preview__hero-tag">{tags[0]}</span> : null}
      </div>
    );
  }

  return (
    <div className={`vmb-card-preview__hero vmb-card-preview__hero--single vmb-card-preview__hero--${accent}`}>
      <div className="vmb-card-preview__hero-single" aria-label={slots[0]?.label ?? "Hero image"}>
        <SlotContent slot={slots[0] ?? { id: "hero", label: "Hero image" }} large />
      </div>
      {tags[0] ? <span className="vmb-card-preview__hero-tag">{tags[0]}</span> : null}
    </div>
  );
}
