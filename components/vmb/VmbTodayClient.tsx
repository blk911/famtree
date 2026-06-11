"use client";

import { useCallback, useEffect, useState } from "react";
import { useAios } from "@/components/taikos/AiosProvider";
import { GoalSummary } from "@/components/taikos/goals/GoalSummary";
import { OpportunityList } from "@/components/taikos/opportunities/OpportunityList";
import { QueueList } from "@/components/taikos/queue/QueueList";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import { contractAction } from "@/lib/taikos/actions/action-registry";
import type { TaikosGoalSummary } from "@/lib/taikos/goals/types";
import type { TaikosOpportunitySummary } from "@/lib/taikos/opportunities/types";
import type { TaikosQueueSummary } from "@/lib/taikos/queue/types";
import type { TaikosActionType } from "@/lib/taikos/types";
import { greetingForOperator } from "@/lib/taikos/context/greeting";

type TodayData = {
  greeting: string;
  goalSummary: TaikosGoalSummary;
  opportunitySummary: TaikosOpportunitySummary;
  queueSummary: TaikosQueueSummary;
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
      const res = await fetch("/api/taikos/context?pathname=/vmb/today", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: {
          salonName: string;
          operatorName?: string;
          goalSummary: TaikosGoalSummary;
          opportunitySummary: TaikosOpportunitySummary;
          queueSummary: TaikosQueueSummary;
        };
      };
      if (res.ok && json.ok && json.data) {
        setData({
          greeting: greetingForOperator(json.data.salonName, json.data.operatorName ?? operatorName),
          goalSummary: json.data.goalSummary,
          opportunitySummary: json.data.opportunitySummary,
          queueSummary: json.data.queueSummary,
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
      subtitle="Goals, opportunities, and your execution queue — no sends yet, just planned work."
    >
      {loading ? (
        <p className="vmb-page-state">Loading your operating brief…</p>
      ) : data ? (
        <div className="vmb-today">
          <p className="vmb-today__greeting">🌞 {data.greeting}</p>
          <GoalSummary summary={data.goalSummary} />
          <OpportunityList summary={data.opportunitySummary} onCreateDraft={handleCreateDraft} />
          <QueueList summary={data.queueSummary} />
        </div>
      ) : (
        <p className="vmb-page-state">Connect your book to unlock Today.</p>
      )}
    </VmbPageFrame>
  );
}
