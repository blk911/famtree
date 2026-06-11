"use client";

import Link from "next/link";
import { QueueCard } from "@/components/taikos/queue/QueueCard";
import type { TaikosQueueSummary } from "@/lib/taikos/queue/types";

type Props = {
  summary: TaikosQueueSummary;
};

export function TodayQueuePanel({ summary }: Props) {
  const recentAdds = summary.allItems
    .filter((i) => i.status === "queued" || i.status === "ready")
    .slice(0, 4);

  return (
    <section className="taikos-queue-list taikos-today-queue">
      <div className="vmb-today__section-head">
        <h3 className="taikos-section-title">Queue Awareness</h3>
        <Link href="/vmb/queue" className="vmb-today__link">
          Open queue
        </Link>
      </div>

      <div className="taikos-today-queue__stats">
        <div className="taikos-today-queue__stat">
          <span className="taikos-today-queue__stat-value">{summary.queuedItems}</span>
          <span className="taikos-today-queue__stat-label">Queued</span>
        </div>
        <div className="taikos-today-queue__stat">
          <span className="taikos-today-queue__stat-value">{summary.readyItems}</span>
          <span className="taikos-today-queue__stat-label">Ready</span>
        </div>
        <div className="taikos-today-queue__stat">
          <span className="taikos-today-queue__stat-value">{summary.blockedItems}</span>
          <span className="taikos-today-queue__stat-label">Blocked</span>
        </div>
      </div>

      {recentAdds.length > 0 ? (
        <>
          <p className="taikos-today-queue__recent-label">Recent Adds</p>
          <div className="taikos-queue-list__items">
            {recentAdds.map((item) => (
              <QueueCard key={item.queueId} item={item} />
            ))}
          </div>
        </>
      ) : (
        <p className="taikos-queue-list__empty">No queued items yet — approve an opportunity inline above.</p>
      )}
    </section>
  );
}
