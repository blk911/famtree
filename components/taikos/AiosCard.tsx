"use client";

import type { AiosCard as AiosCardType } from "@/lib/taikos/types";
import { AiosActionButton } from "@/components/taikos/AiosActionButton";

type Props = {
  card: AiosCardType;
  onAction?: (action: import("@/lib/taikos/types").AiosAction) => void;
};

export function AiosCard({ card, onAction }: Props) {
  return (
    <article className="aios-card">
      <div className="aios-card__head">
        <h4 className="aios-card__title">{card.title}</h4>
        {card.meta ? <span className="aios-card__meta">{card.meta}</span> : null}
      </div>
      {card.subtitle ? <p className="aios-card__subtitle">{card.subtitle}</p> : null}
      <p className="aios-card__body">{card.body}</p>
      {card.actions && card.actions.length > 0 ? (
        <div className="aios-card__actions">
          {card.actions.map((action) => (
            <AiosActionButton key={action.id} action={action} onClick={onAction} />
          ))}
        </div>
      ) : null}
    </article>
  );
}
