"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OpportunityWorkflowCard } from "@/components/taikos/workflow/OpportunityWorkflowCard";
import { SortableListHeader } from "@/components/vmb/SortableListHeader";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import type { TaikosGoalSummary } from "@/lib/taikos/goals/types";
import type { TaikosOpportunity, TaikosOpportunitySummary } from "@/lib/taikos/opportunities/types";
import type { OpportunityAnalysisContext } from "@/lib/vmb/opportunities/opportunity-intelligence";
import { useSortableList } from "@/lib/vmb/useSortableList";

type OppSortKey = "title" | "value" | "confidence";

type Props = {
  initialAnalysisId?: string;
};

export function VmbOpportunitiesCenterClient({ initialAnalysisId }: Props) {
  const [summary, setSummary] = useState<TaikosOpportunitySummary | null>(null);
  const [goals, setGoals] = useState<TaikosGoalSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [oppRes, goalRes] = await Promise.allSettled([
        fetch("/api/taikos/opportunities", { cache: "no-store", credentials: "include" }),
        fetch("/api/taikos/goals", { cache: "no-store", credentials: "include" }),
      ]);

      if (oppRes.status === "fulfilled") {
        const res = oppRes.value;
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const oppJson = (await res.json()) as { ok: boolean; data?: TaikosOpportunitySummary };
          setSummary(res.ok && oppJson.ok && oppJson.data ? oppJson.data : null);
        } else {
          setSummary(null);
        }
      } else {
        setSummary(null);
      }

      if (goalRes.status === "fulfilled") {
        const res = goalRes.value;
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const goalJson = (await res.json()) as { ok: boolean; data?: TaikosGoalSummary };
          setGoals(res.ok && goalJson.ok && goalJson.data ? goalJson.data : null);
        } else {
          setGoals(null);
        }
      } else {
        setGoals(null);
      }
    } catch {
      setSummary(null);
      setGoals(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const opps = summary?.opportunities ?? [];
    return {
      High: opps.filter((o) => o.priority === "High"),
      Medium: opps.filter((o) => o.priority === "Medium"),
      Low: opps.filter((o) => o.priority === "Low"),
    };
  }, [summary]);

  function goalTitleFor(opp: TaikosOpportunity): string | undefined {
    if (!opp.linkedGoalId || !goals) return undefined;
    return goals.goals.find((g) => g.goalId === opp.linkedGoalId)?.title;
  }

  const analysisContext: OpportunityAnalysisContext = {
    analysisId: initialAnalysisId,
    hasRealBookData: (summary?.totalOpportunities ?? 0) > 0,
  };

  return (
    <VmbPageFrame
      title="Opportunities"
      subtitle="Ranked moves from your book — preview drafts and queue planned work."
    >
      {loading ? (
        <p className="vmb-page-state">Loading opportunities…</p>
      ) : summary && summary.totalOpportunities > 0 ? (
        <div className="vmb-opp-center">
          {(["High", "Medium", "Low"] as const).map((priority) =>
            grouped[priority].length > 0 ? (
              <OpportunityPrioritySection
                key={priority}
                priority={priority}
                opportunities={grouped[priority]}
                goalTitleFor={goalTitleFor}
                analysisContext={analysisContext}
                onRefresh={load}
              />
            ) : null,
          )}
        </div>
      ) : (
        <p className="vmb-page-state">No opportunities yet — refresh your book to surface moves.</p>
      )}
    </VmbPageFrame>
  );
}

function OpportunityPrioritySection({
  priority,
  opportunities,
  goalTitleFor,
  analysisContext,
  onRefresh,
}: {
  priority: string;
  opportunities: TaikosOpportunity[];
  goalTitleFor: (opp: TaikosOpportunity) => string | undefined;
  analysisContext?: OpportunityAnalysisContext;
  onRefresh: () => void;
}) {
  const accessors = useMemo(
    () => ({
      title: (o: TaikosOpportunity) => o.title,
      value: (o: TaikosOpportunity) => o.estimatedValue,
      confidence: (o: TaikosOpportunity) => o.confidence,
    }),
    [],
  );

  const { sortedItems, sortKey, sortDirection, setSort } = useSortableList(opportunities, {
    defaultKey: "value",
    defaultDirection: "desc",
    accessors,
  });

  return (
    <section className="vmb-opp-center__section">
      <h3 className="taikos-section-title">{priority} Priority</h3>
      <SortableListHeader<OppSortKey>
        columns={[
          { key: "title", label: "Opportunity" },
          { key: "value", label: "Value", align: "right" },
          { key: "confidence", label: "Confidence", align: "right" },
        ]}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={setSort}
        gridTemplateColumns="1.4fr 0.7fr 0.8fr"
      />
      <div className="vmb-opp-center__grid">
        {sortedItems.map((opp) => (
          <OpportunityWorkflowCard
            key={opp.opportunityId}
            opportunity={opp}
            goalTitle={goalTitleFor(opp)}
            analysisContext={analysisContext}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </section>
  );
}
