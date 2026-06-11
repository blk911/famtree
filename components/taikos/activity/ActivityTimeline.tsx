"use client";

import type { TaikosActivitySummary } from "@/lib/taikos/activity/activity-types";

type Props = {
  summary: TaikosActivitySummary;
  compact?: boolean;
};

export function ActivityTimeline({ summary, compact = false }: Props) {
  if (summary.recentEvents.length === 0) {
    return <p className="vmb-page-state">No business activity yet — moves will appear here as stories.</p>;
  }

  return (
    <ul className={`taikos-activity-timeline${compact ? " taikos-activity-timeline--compact" : ""}`}>
      {summary.recentEvents.map((event) => (
        <li key={event.activityId} className="taikos-activity-timeline__item">
          <span className="taikos-activity-timeline__emoji" aria-hidden>
            {event.emoji}
          </span>
          <div className="taikos-activity-timeline__body">
            <p className="taikos-activity-timeline__headline">{event.headline}</p>
            {event.detail ? <p className="taikos-activity-timeline__detail">{event.detail}</p> : null}
            {!compact ? (
              <time className="taikos-activity-timeline__time" dateTime={event.createdAt}>
                {new Date(event.createdAt).toLocaleString()}
              </time>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
