"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GoalCard } from "@/components/taikos/goals/GoalCard";
import { GoalEditor } from "@/components/taikos/goals/GoalEditor";
import { VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import type { TaikosGoalListItem, TaikosGoalSummary } from "@/lib/taikos/goals/types";

export function VmbGoalsCenterClient() {
  const [summary, setSummary] = useState<TaikosGoalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TaikosGoalListItem | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/taikos/goals", { cache: "no-store", credentials: "include" });
      const json = (await res.json()) as { ok: boolean; data?: TaikosGoalSummary };
      setSummary(res.ok && json.ok && json.data ? json.data : null);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const goals = summary?.goals ?? [];
    return {
      active: goals.filter((g) => g.status === "active" || g.status === "paused" || g.status === "draft"),
      completed: goals.filter((g) => g.status === "completed"),
      archived: goals.filter((g) => g.status === "archived"),
    };
  }, [summary]);

  async function setGoalStatus(goal: TaikosGoalListItem, status: TaikosGoalListItem["status"]) {
    await fetch(`/api/taikos/goals/${goal.goalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    });
    await load();
  }

  function renderGoals(title: string, goals: TaikosGoalListItem[]) {
    if (goals.length === 0) return null;
    return (
      <section className="vmb-goals-center__section">
        <h3 className="taikos-section-title">{title}</h3>
        <div className="vmb-goals-center__grid">
          {goals.map((goal) => (
            <div key={goal.goalId} className="vmb-goals-center__card-wrap">
              <GoalCard goal={goal} />
              <div className="vmb-goals-center__actions">
                <button type="button" className="taikos-opp-card__cta taikos-opp-card__cta--secondary" onClick={() => setEditing(goal)}>
                  Edit
                </button>
                {goal.status === "active" ? (
                  <button type="button" className="taikos-opp-card__cta taikos-opp-card__cta--ghost" onClick={() => void setGoalStatus(goal, "paused")}>
                    Pause
                  </button>
                ) : null}
                {goal.status !== "archived" ? (
                  <button type="button" className="taikos-opp-card__cta taikos-opp-card__cta--ghost" onClick={() => void setGoalStatus(goal, "archived")}>
                    Archive
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <VmbPageFrame title="Goals" subtitle="Outcome targets that drive opportunities, drafts, and queue priorities.">
      <div className="vmb-goals-center__toolbar">
        <button type="button" className="taikos-opp-card__cta" onClick={() => { setCreating(true); setEditing(null); }}>
          Create Goal
        </button>
      </div>

      {creating || editing ? (
        <div className="vmb-goals-center__editor">
          <GoalEditor
            goal={editing ?? undefined}
            onSaved={() => {
              setCreating(false);
              setEditing(null);
              void load();
            }}
            onCancel={() => {
              setCreating(false);
              setEditing(null);
            }}
          />
        </div>
      ) : null}

      {loading ? (
        <p className="vmb-page-state">Loading goals…</p>
      ) : summary ? (
        <div className="vmb-goals-center">
          {renderGoals("Active Goals", grouped.active)}
          {renderGoals("Completed Goals", grouped.completed)}
          {renderGoals("Archived Goals", grouped.archived)}
        </div>
      ) : (
        <p className="vmb-page-state">Connect your book to unlock goals.</p>
      )}
    </VmbPageFrame>
  );
}
