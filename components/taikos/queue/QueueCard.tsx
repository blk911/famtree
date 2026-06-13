"use client";

import type { TaikosQueueItem } from "@/lib/taikos/queue/types";
import { queueItemGreetingPreview } from "@/lib/vmb/cards/queued-invite-card-payload";

type Props = {
  item: TaikosQueueItem;
};

export function QueueCard({ item }: Props) {
  const invitePreview = queueItemGreetingPreview(item.inviteCard);
  return (
    <article className="taikos-queue-card">
      <h4 className="taikos-queue-card__title">{item.draftTitle}</h4>
      {invitePreview ? <p className="taikos-queue-card__meta">{invitePreview}</p> : null}
      <p className="taikos-queue-card__meta">
        {item.draftType.replace(/_/g, " ")} · {item.status}
        {item.goalTitle ? ` · Goal: ${item.goalTitle}` : ""}
      </p>
      {item.estimatedValue > 0 ? (
        <p className="taikos-queue-card__value">+${item.estimatedValue.toLocaleString()}</p>
      ) : null}
    </article>
  );
}
