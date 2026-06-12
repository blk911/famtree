"use client";

import { TaikosInsightCard } from "@/components/taikos/coda/TaikosInsightCard";
import type { TaikosInsight } from "@/lib/taikos/coda/types";

type Props = {
  insights: TaikosInsight[];
  onRefresh?: () => void;
};

export function TaikosInsightList({ insights, onRefresh }: Props) {
  if (insights.length === 0) return null;

  return (
    <section className="taikos-insight-list">
      <h3 className="taikos-section-title">Relationship Discoveries</h3>
      <p className="taikos-opp-list__hint">Context → Objective → Discovery → Action. Preview inline without leaving Today.</p>
      <div className="taikos-insight-list__items">
        {insights.slice(0, 4).map((insight) => (
          <TaikosInsightCard key={insight.id} insight={insight} onRefresh={onRefresh} />
        ))}
      </div>
    </section>
  );
}
