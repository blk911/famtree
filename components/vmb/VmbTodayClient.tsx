"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAios } from "@/components/taikos/AiosProvider";
import { ActivityTimeline } from "@/components/taikos/activity/ActivityTimeline";
import { AiosDraftList } from "@/components/taikos/drafts/AiosDraftList";
import { GoalSummary } from "@/components/taikos/goals/GoalSummary";
import { OpportunityList } from "@/components/taikos/opportunities/OpportunityList";
import { QueueList } from "@/components/taikos/queue/QueueList";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import { contractAction } from "@/lib/taikos/actions/action-registry";
import type { TaikosActivitySummary } from "@/lib/taikos/activity/activity-types";
import type { TaikosDraftSummary } from "@/lib/taikos/drafts/types";
import type { TaikosGoalSummary } from "@/lib/taikos/goals/types";
import type { TaikosOpportunitySummary } from "@/lib/taikos/opportunities/types";
import type { TaikosQueueSummary } from "@/lib/taikos/queue/types";
import type { MorningBriefing, TaikosActionType } from "@/lib/taikos/types";
import { greetingForOperator } from "@/lib/taikos/context/greeting";

type TodayData = {
  greeting: string;
  briefing?: MorningBriefing;
  goalSummary: TaikosGoalSummary;
  opportunitySummary: TaikosOpportunitySummary;
  queueSummary: TaikosQueueSummary;
  activitySummary: TaikosActivitySummary;
  draftSummary: TaikosDraftSummary;
};

type Props = {
  salonName?: string;
  operatorName?: string;
};

export function VmbTodayClient({ salonName, operatorName }: Props) {
  const { openPanel, runContractAction } = useAios();
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ctxRes, briefingRes] = await Promise.all([
        fetch("/api/taikos/context?pathname=/vmb/today", { cache: "no-store", credentials: "include" }),
        fetch("/api/taikos/briefing", { cache: "no-store", credentials: "include" }),
      ]);
      const ctxJson = (await ctxRes.json()) as {
        ok: boolean;
        data?: {
          salonName: string;
          operatorName?: string;
          goalSummary: TaikosGoalSummary;
          opportunitySummary: TaikosOpportunitySummary;
          queueSummary: TaikosQueueSummary;
          activitySummary: TaikosActivitySummary;
          draftSummary: TaikosDraftSummary;
        };
      };
      const briefingJson = (await briefingRes.json()) as { ok: boolean; data?: { briefing?: MorningBriefing } };

      if (ctxRes.ok && ctxJson.ok && ctxJson.data) {
        setData({
          greeting: greetingForOperator(ctxJson.data.salonName, ctxJson.data.operatorName ?? operatorName),
          briefing: briefingJson.ok && briefingJson.data?.briefing ? briefingJson.data.briefing : undefined,
          goalSummary: ctxJson.data.goalSummary,
          opportunitySummary: ctxJson.data.opportunitySummary,
          queueSummary: ctxJson.data.queueSummary,
          activitySummary: ctxJson.data.activitySummary,
          draftSummary: ctxJson.data.draftSummary,
        });
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [operatorName]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleCreateDraft(actionType: TaikosActionType) {
    void openPanel("page-assistant");
    runContractAction(contractAction(`today-${actionType}`, actionType, "Create Draft"));
  }

  return (
    <VmbPageFrame
      eyebrow={salonName ?? "Your Salon"}
      title="Today"
      subtitle="Your operating home — briefing, goals, opportunities, queue, activity, and drafts."
    >
      {loading ? (
        <p className="vmb-page-state">Loading your operating brief…</p>
      ) : data ? (
        <div className="vmb-today">
          <p className="vmb-today__greeting">🌞 {data.greeting}</p>

          {data.briefing ? (
            <section className="vmb-today__section">
              <h3 className="taikos-section-title">Morning Briefing</h3>
              <p className="vmb-today__briefing">{data.briefing.summary}</p>
            </section>
          ) : null}

          <GoalSummary summary={data.goalSummary} />
          <OpportunityList summary={data.opportunitySummary} onCreateDraft={handleCreateDraft} />
          <QueueList summary={data.queueSummary} />

          <section className="vmb-today__section">
            <div className="vmb-today__section-head">
              <h3 className="taikos-section-title">Activity</h3>
              <Link href="/vmb/activity" className="vmb-today__link">
                View all
              </Link>
            </div>
            <ActivityTimeline summary={data.activitySummary} compact />
          </section>

          {data.draftSummary.openDrafts > 0 ? (
            <section className="vmb-today__section">
              <div className="vmb-today__section-head">
                <h3 className="taikos-section-title">Drafts</h3>
                <Link href="/vmb/campaigns" className="vmb-today__link">
                  Open workspace
                </Link>
              </div>
              <AiosDraftList limit={4} />
            </section>
          ) : null}
        </div>
      ) : (
        <p className="vmb-page-state">Connect your book to unlock Today.</p>
      )}
    </VmbPageFrame>
  );
}
