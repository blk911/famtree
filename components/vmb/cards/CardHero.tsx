"use client";

import type { CardImageLayout, CardAccent } from "@/lib/vmb/cards/card-types";
import type { CardImageSlot } from "@/lib/vmb/cards/card-preview-model";

type Props = {
  layout: CardImageLayout;
  slots: CardImageSlot[];
  accent: CardAccent;
  tags: string[];
};

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
              <span className="vmb-card-preview__placeholder-icon" aria-hidden>
                ✦
              </span>
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
        <span className="vmb-card-preview__placeholder-icon vmb-card-preview__placeholder-icon--large" aria-hidden>
          ✦
        </span>
        <p className="vmb-card-preview__hero-placeholder-label">Image placeholder</p>
      </div>
      {tags[0] ? <span className="vmb-card-preview__hero-tag">{tags[0]}</span> : null}
    </div>
  );
}
