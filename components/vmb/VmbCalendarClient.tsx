"use client";

import { useCallback, useEffect, useState } from "react";
import { useAios } from "@/components/taikos/AiosProvider";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import { contractAction } from "@/lib/taikos/actions/action-registry";
import type { TaikosOpportunitySummary } from "@/lib/taikos/opportunities/types";
import type { AiosCalendarSummary } from "@/lib/taikos/types";

type CalendarData = {
  calendarSummary: AiosCalendarSummary;
  opportunitySummary: TaikosOpportunitySummary;
  goalTitle?: string;
};

export function VmbCalendarClient() {
  const { openPanel, runContractAction } = useAios();
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/taikos/context?pathname=/vmb/appointments", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: CalendarData & { goalSummary?: { goals: { goalId: string; title: string }[] } };
      };
      if (res.ok && json.ok && json.data) {
        const slotOpp = json.data.opportunitySummary.opportunities.find((o) => o.category === "Open Slot");
        const goalTitle = slotOpp?.linkedGoalId
          ? json.data.goalSummary?.goals.find((g) => g.goalId === slotOpp.linkedGoalId)?.title
          : undefined;
        setData({
          calendarSummary: json.data.calendarSummary,
          opportunitySummary: json.data.opportunitySummary,
          goalTitle,
        });
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function handlePreview() {
    void openPanel("page-assistant");
    runContractAction(contractAction("cal-gap", "VIEW_CALENDAR_GAP", "Preview Campaign"));
  }

  return (
    <VmbPageFrame title="Calendar" subtitle="Open slots, cancellations, and fill opportunities from your book.">
      {loading ? (
        <p className="vmb-page-state">Loading calendar…</p>
      ) : data && data.calendarSummary.openSlots > 0 ? (
        <div className="vmb-calendar-center">
          {data.calendarSummary.slots.map((slot) => (
            <article key={slot} className="vmb-calendar-slot-card">
              <h3 className="vmb-calendar-slot-card__title">{slot} Open</h3>
              <p className="vmb-calendar-slot-card__value">
                Potential value:{" "}
                <strong>
                  $
                  {(
                    data.opportunitySummary.topOpportunity?.estimatedValue ?? 95
                  ).toLocaleString()}
                </strong>
              </p>
              {data.goalTitle ? <p className="vmb-calendar-slot-card__goal">Goal: {data.goalTitle}</p> : null}
              <div className="taikos-opp-card__actions">
                <button type="button" className="taikos-opp-card__cta" onClick={handlePreview}>
                  Preview Campaign
                </button>
                <button type="button" className="taikos-opp-card__cta taikos-opp-card__cta--secondary" onClick={handlePreview}>
                  Add To Queue
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="vmb-page-state">No open slot opportunities detected — refresh your book to update calendar signals.</p>
      )}
    </VmbPageFrame>
  );
}
