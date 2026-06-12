"use client";

import { useCallback, useEffect, useState } from "react";
import { InlineDeliverablePreview } from "@/components/taikos/workflow/InlineDeliverablePreview";
import { OpportunityLifecycle } from "@/components/taikos/workflow/OpportunityLifecycle";
import { useInlineActionWorkflow } from "@/components/taikos/workflow/useInlineActionWorkflow";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import type { TaikosOpportunitySummary } from "@/lib/taikos/opportunities/types";
import type { AiosCalendarSummary } from "@/lib/taikos/types";

type CalendarData = {
  calendarSummary: AiosCalendarSummary;
  opportunitySummary: TaikosOpportunitySummary;
  goalTitle?: string;
};

function CalendarSlotWorkflow({ goalTitle }: { goalTitle?: string }) {
  const workflow = useInlineActionWorkflow({
    actionType: "VIEW_CALENDAR_GAP",
    sourceId: "cal-gap",
    pathname: "/vmb/appointments",
  });

  return (
    <>
      <OpportunityLifecycle stage={workflow.stage} />
      {goalTitle ? <p className="vmb-calendar-slot-card__goal">Goal: {goalTitle}</p> : null}
      {workflow.stage === "detected" ? (
        <div className="taikos-opp-card__actions">
          <button
            type="button"
            className="taikos-opp-card__cta"
            disabled={workflow.busy}
            onClick={() => void workflow.runPreview()}
          >
            Preview Campaign
          </button>
          <button
            type="button"
            className="taikos-opp-card__cta taikos-opp-card__cta--secondary"
            disabled={workflow.busy}
            onClick={() => void workflow.runPreview()}
          >
            Add To Queue
          </button>
        </div>
      ) : null}

      {workflow.expanded && workflow.preview ? (
        <div className="taikos-inline-workflow">
          <InlineDeliverablePreview deliverable={workflow.preview.deliverable} />
          {workflow.stage === "previewed" ? (
            <div className="taikos-inline-workflow__actions">
              <button
                type="button"
                className="taikos-opp-card__cta"
                disabled={workflow.busy}
                onClick={() => void workflow.runApprove()}
              >
                Approve
              </button>
            </div>
          ) : null}
          {workflow.stage === "approved" ? (
            <div className="taikos-inline-workflow__approved">
              <p className="taikos-inline-workflow__message">{workflow.statusMessage}</p>
              {workflow.canQueue ? (
                <button
                  type="button"
                  className="taikos-opp-card__cta"
                  disabled={workflow.busy}
                  onClick={() => void workflow.runQueue()}
                >
                  Add To Queue
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export function VmbCalendarClient() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/taikos/context?pathname=/vmb/appointments&recordLogin=0", {
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
                  ${(data.opportunitySummary.topOpportunity?.estimatedValue ?? 95).toLocaleString()}
                </strong>
              </p>
              <CalendarSlotWorkflow goalTitle={data.goalTitle} />
            </article>
          ))}
        </div>
      ) : (
        <p className="vmb-page-state">No open slot opportunities detected — refresh your book to update calendar signals.</p>
      )}
    </VmbPageFrame>
  );
}
