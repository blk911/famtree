"use client";

import { QueueCard } from "@/components/taikos/queue/QueueCard";
import type { TaikosQueueSummary } from "@/lib/taikos/queue/types";

type Props = {
  summary: TaikosQueueSummary;
};

export function QueueList({ summary }: Props) {
  if (summary.recentItems.length === 0) {
    return (
      <section className="taikos-queue-list">
        <h3 className="taikos-section-title">Execution Queue</h3>
        <p className="taikos-queue-list__empty">No queued items yet. Approve a draft and add it to the queue.</p>
      </section>
    );
  }

  return (
    <section className="taikos-queue-list">
      <h3 className="taikos-section-title">
        Execution Queue
        <span className="taikos-queue-list__count">{summary.queuedItems} ready</span>
      </h3>
      <div className="taikos-queue-list__items">
        {summary.recentItems.map((item) => (
          <QueueCard key={item.queueId} item={item} />
        ))}
      </div>
    </section>
  );
}
