"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OpportunityWorkflowCard } from "@/components/taikos/workflow/OpportunityWorkflowCard";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import type { TaikosGoalSummary } from "@/lib/taikos/goals/types";
import type { TaikosOpportunity, TaikosOpportunitySummary } from "@/lib/taikos/opportunities/types";

export function VmbOpportunitiesCenterClient() {
  const [summary, setSummary] = useState<TaikosOpportunitySummary | null>(null);
  const [goals, setGoals] = useState<TaikosGoalSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [oppRes, goalRes] = await Promise.all([
        fetch("/api/taikos/opportunities", { cache: "no-store", credentials: "include" }),
        fetch("/api/taikos/goals", { cache: "no-store", credentials: "include" }),
      ]);
      const oppJson = (await oppRes.json()) as { ok: boolean; data?: TaikosOpportunitySummary };
      const goalJson = (await goalRes.json()) as { ok: boolean; data?: TaikosGoalSummary };
      setSummary(oppRes.ok && oppJson.ok && oppJson.data ? oppJson.data : null);
      setGoals(goalRes.ok && goalJson.ok && goalJson.data ? goalJson.data : null);
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
              <section key={priority} className="vmb-opp-center__section">
                <h3 className="taikos-section-title">{priority} Priority</h3>
                <div className="vmb-opp-center__grid">
                  {grouped[priority].map((opp) => (
                    <OpportunityWorkflowCard
                      key={opp.opportunityId}
                      opportunity={opp}
                      goalTitle={goalTitleFor(opp)}
                      onRefresh={load}
                    />
                  ))}
                </div>
              </section>
            ) : null,
          )}
        </div>
      ) : (
        <p className="vmb-page-state">No opportunities yet — refresh your book to surface moves.</p>
      )}
    </VmbPageFrame>
  );
}
