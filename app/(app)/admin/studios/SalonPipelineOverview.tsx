"use client";

import { useCallback, useEffect, useState } from "react";
import { MarketIntelChrome } from "@/components/admin/MarketIntelChrome";
import { SalonPipelineKpiCards } from "@/components/admin/intelligence/salon/SalonPipelineKpiCards";
import type { SalonPipelineSummary } from "@/lib/intelligence/salon/pipeline/pipeline-types";

export function SalonPipelineOverview() {
  const [counts, setCounts] = useState<SalonPipelineSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/intelligence/salon/pipeline/summary", {
        cache: "no-store",
      });
      const json = (await res.json()) as { ok: boolean; summary?: SalonPipelineSummary };
      if (json.ok && json.summary) setCounts(json.summary);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="mb-4">
      <MarketIntelChrome />

      <div className="mb-2">
        <h2 className="m-0 text-sm font-extrabold text-stone-900">Pipeline status</h2>
        <p className="m-0 mt-0.5 text-xs text-stone-500">
          Click a stage to open its tools.
        </p>
      </div>

      <SalonPipelineKpiCards counts={counts} countsLoading={loading} />

      {counts ? (
        <p className="mt-2 text-[11px] text-stone-400">
          {counts.totalOperators.toLocaleString()} salon operators · updated{" "}
          {new Date(counts.updatedAt).toLocaleString()}
        </p>
      ) : null}
    </section>
  );
}
