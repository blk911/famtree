import type { TaikosActivityEvent, TaikosActivitySummary } from "./activity-types";

export function summarizeActivities(events: TaikosActivityEvent[], limit = 12): TaikosActivitySummary {
  return {
    totalEvents: events.length,
    recentEvents: events.slice(0, limit),
  };
}
