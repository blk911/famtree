"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ActivityTimeline } from "@/components/taikos/activity/ActivityTimeline";
import { TaikosInsightList } from "@/components/taikos/coda/TaikosInsightList";
import { TodayCodaBanner } from "@/components/taikos/coda/TodayCodaBanner";
import { GoalSummary } from "@/components/taikos/goals/GoalSummary";
import { OpportunityList } from "@/components/taikos/opportunities/OpportunityList";
import { TodayDraftPanel } from "@/components/taikos/workflow/TodayDraftPanel";
import { TodayQueuePanel } from "@/components/taikos/workflow/TodayQueuePanel";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import { emptyCodaSummary } from "@/lib/taikos/coda/defaults";
import type { TaikosActivitySummary } from "@/lib/taikos/activity/activity-types";
import type { CodaSummary } from "@/lib/taikos/coda/types";
import type { TaikosDraftSummary } from "@/lib/taikos/drafts/types";
import type { TaikosGoalSummary } from "@/lib/taikos/goals/types";
import type { TaikosOpportunitySummary } from "@/lib/taikos/opportunities/types";
import type { TaikosQueueSummary } from "@/lib/taikos/queue/types";
import { greetingForOperator } from "@/lib/taikos/context/greeting";
import { resolveBookLoadedState } from "@/lib/vmb/book-status";

type TodayData = {
  greeting: string;
  codaSummary: CodaSummary;
  goalSummary: TaikosGoalSummary;
  opportunitySummary: TaikosOpportunitySummary;
  queueSummary: TaikosQueueSummary;
  activitySummary: TaikosActivitySummary;
  draftSummary: TaikosDraftSummary;
};

type BookDebugState = {
  salonId?: string;
  analysisId?: string;
  hasRealBookData?: boolean;
  totalClients?: number;
  importedClientCount?: number;
  recordCount?: number;
  clientsLength?: number;
  bookLoadedResolved: boolean;
};

const EMPTY_GOAL_SUMMARY: TaikosGoalSummary = {
  totalGoals: 0,
  activeGoals: 0,
  completedGoals: 0,
  archivedGoals: 0,
  goals: [],
};

const EMPTY_OPPORTUNITY_SUMMARY: TaikosOpportunitySummary = {
  totalOpportunities: 0,
  highPriority: 0,
  topOpportunity: null,
  opportunities: [],
};

const EMPTY_QUEUE_SUMMARY: TaikosQueueSummary = {
  totalItems: 0,
  queuedItems: 0,
  readyItems: 0,
  blockedItems: 0,
  completedItems: 0,
  recentItems: [],
  allItems: [],
};

const EMPTY_ACTIVITY_SUMMARY: TaikosActivitySummary = {
  totalEvents: 0,
  recentEvents: [],
};

const EMPTY_DRAFT_SUMMARY: TaikosDraftSummary = {
  totalDrafts: 0,
  openDrafts: 0,
  draftsByType: {},
  recentDrafts: [],
};

type Props = {
  salonName?: string;
  operatorName?: string;
};

export function VmbTodayClient({ salonName, operatorName }: Props) {
  const [data, setData] = useState<TodayData | null>(null);
  const [bookLoaded, setBookLoaded] = useState(false);
  const [debug, setDebug] = useState<BookDebugState | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ctxRes = await fetch(
        "/api/taikos/context?pathname=/vmb/today&recordLogin=0",
        { cache: "no-store", credentials: "include" },
      );
      const ctxJson = (await ctxRes.json()) as {
        ok: boolean;
        data?: {
          salonId: string;
          salonName: string;
          operatorName?: string;
          analysisId?: string;
          hasRealBookData?: boolean;
          recordCount?: number;
          clientSummary?: { totalClients?: number };
          codaSummary?: CodaSummary;
          goalSummary?: TaikosGoalSummary;
          opportunitySummary?: TaikosOpportunitySummary;
          queueSummary?: TaikosQueueSummary;
          activitySummary?: TaikosActivitySummary;
          draftSummary?: TaikosDraftSummary;
        };
      };

      const slice = ctxJson.data;
      const loaded = slice
        ? resolveBookLoadedState({
            hasRealBookData: slice.hasRealBookData,
            clientSummary: slice.clientSummary,
            codaSummary: slice.codaSummary,
            analysisId: slice.analysisId,
            recordCount: slice.recordCount,
          })
        : false;

      setBookLoaded(loaded);

      if (process.env.NODE_ENV === "development") {
        const debugState: BookDebugState = {
          salonId: slice?.salonId,
          analysisId: slice?.analysisId,
          hasRealBookData: slice?.hasRealBookData,
          totalClients: slice?.clientSummary?.totalClients,
          importedClientCount: slice?.codaSummary?.context?.importedClientCount,
          recordCount: slice?.recordCount,
          clientsLength: 0,
          bookLoadedResolved: loaded,
        };
        setDebug(debugState);
        console.log("[vmb:today:debug]", debugState);
      }

      if (ctxRes.ok && ctxJson.ok && slice) {
        const owner = slice.operatorName ?? operatorName ?? "Owner";
        const codaSummary = slice.codaSummary ?? emptyCodaSummary(owner);
        setData({
          greeting: greetingForOperator(slice.salonName ?? salonName ?? "Your Salon", owner),
          codaSummary,
          goalSummary: slice.goalSummary ?? EMPTY_GOAL_SUMMARY,
          opportunitySummary: slice.opportunitySummary ?? EMPTY_OPPORTUNITY_SUMMARY,
          queueSummary: slice.queueSummary ?? EMPTY_QUEUE_SUMMARY,
          activitySummary: slice.activitySummary ?? EMPTY_ACTIVITY_SUMMARY,
          draftSummary: slice.draftSummary ?? EMPTY_DRAFT_SUMMARY,
        });
      } else {
        setData(null);
      }
    } catch {
      setData(null);
      setBookLoaded(false);
    } finally {
      setLoading(false);
    }
  }, [operatorName, salonName]);

  useEffect(() => {
    void load();
  }, [load]);

  const codaSummary = data?.codaSummary ?? emptyCodaSummary(operatorName ?? "Owner");
  const insights = codaSummary.insights ?? [];
  const showToday = !!data && bookLoaded;

  return (
    <VmbPageFrame
      eyebrow={salonName ?? "Your Salon"}
      title="Today"
      subtitle="Relationship guidance — context, objective, discovery, and your next action."
    >
      {process.env.NODE_ENV === "development" && debug ? (
        <pre
          className="vmb-page-state"
          style={{ fontSize: 11, marginBottom: 12, whiteSpace: "pre-wrap" }}
        >
          {[
            `salonId: ${debug.salonId ?? "—"}`,
            `analysisId: ${debug.analysisId ?? "—"}`,
            `hasRealBookData: ${String(debug.hasRealBookData ?? false)}`,
            `clientSummary.totalClients: ${debug.totalClients ?? 0}`,
            `codaSummary.context.importedClientCount: ${debug.importedClientCount ?? 0}`,
            `recordCount: ${debug.recordCount ?? 0}`,
            `clients.length: ${debug.clientsLength ?? 0}`,
            `bookLoadedResolved: ${String(debug.bookLoadedResolved)}`,
          ].join("\n")}
        </pre>
      ) : null}

      {loading ? (
        <p className="vmb-page-state">Loading your operating brief…</p>
      ) : showToday ? (
        <div className="vmb-today">
          <TodayCodaBanner greeting={data!.greeting} coda={codaSummary} />

          <TaikosInsightList insights={insights} onRefresh={load} />

          <OpportunityList
            summary={data!.opportunitySummary}
            insights={insights}
            goals={data!.goalSummary.goals}
            onRefresh={load}
          />

          <GoalSummary
            summary={data!.goalSummary}
            opportunities={data!.opportunitySummary.opportunities}
            onRefresh={load}
          />

          <TodayQueuePanel summary={data!.queueSummary} />

          <TodayDraftPanel drafts={data!.draftSummary.recentDrafts} onRefresh={load} />

          <section className="vmb-today__section">
            <div className="vmb-today__section-head">
              <h3 className="taikos-section-title">Activity</h3>
              <Link href="/vmb/activity" className="vmb-today__link">
                View all
              </Link>
            </div>
            <ActivityTimeline summary={data!.activitySummary} compact />
          </section>
        </div>
      ) : (
        <p className="vmb-page-state">Connect your book to unlock Today.</p>
      )}
    </VmbPageFrame>
  );
}
