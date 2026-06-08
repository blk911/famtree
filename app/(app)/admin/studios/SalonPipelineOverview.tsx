"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MarketIntelNav } from "@/components/admin/MarketIntelNav";
import { IntelligenceMarketNav } from "@/components/admin/IntelligenceMarketNav";
import { SalonPipelineHeader } from "@/components/admin/intelligence/salon/SalonPipelineHeader";
import { SALON_PIPELINE_STAGES } from "@/lib/intelligence/salon/pipeline/salon-pipeline-config";
import type { SalonPipelineSummary, SalonPipelineStageId } from "@/lib/intelligence/salon/pipeline/pipeline-types";

export function SalonPipelineOverview() {
  const [counts, setCounts] = useState<SalonPipelineSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [highlightStage, setHighlightStage] = useState<SalonPipelineStageId>("discover");

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
    const hash = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
    if (hash && SALON_PIPELINE_STAGES.some((s) => s.id === hash)) {
      setHighlightStage(hash as SalonPipelineStageId);
    }
    const onHash = () => {
      const h = window.location.hash.replace("#", "");
      if (SALON_PIPELINE_STAGES.some((s) => s.id === h)) {
        setHighlightStage(h as SalonPipelineStageId);
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [load]);

  return (
    <section className="mb-6">
      <MarketIntelNav />
      <IntelligenceMarketNav />

      <div className="mb-3">
        <h1 className="m-0 mb-1 text-xl font-extrabold text-stone-900 sm:text-2xl">
          Pipeline Overview
        </h1>
        <p className="m-0 max-w-2xl text-sm leading-snug text-stone-600">
          Salon intelligence flows in five stages. Pick a stage to see its tools, or jump to a
          primary action below.
        </p>
      </div>

      <SalonPipelineHeader
        currentStage={highlightStage}
        counts={counts}
        countsLoading={loading}
        onStageSelect={setHighlightStage}
      />

      <p className="mb-3 mt-2 text-xs leading-snug text-stone-600">
        <strong>Unlock Your Client Relationships</strong> — open the visualization thumbnail (upper
        right on pipeline tools) to preview private client network growth.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {SALON_PIPELINE_STAGES.map((stage) => {
          const count = counts?.[stage.id];
          const active = highlightStage === stage.id;
          return (
            <div
              key={stage.id}
              id={stage.id}
              className={[
                "scroll-mt-20 rounded-xl border bg-white p-3.5 shadow-sm",
                active
                  ? "border-rose-800 ring-1 ring-rose-200"
                  : "border-stone-200",
              ].join(" ")}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-rose-800">
                  {stage.order}. {stage.label}
                </span>
              </div>
              <div className="mb-1.5 text-xl font-extrabold leading-none text-stone-900">
                {loading ? "…" : (count ?? 0).toLocaleString()}
              </div>
              <p className="m-0 mb-2.5 line-clamp-2 text-xs leading-snug text-stone-600">
                {stage.description}
              </p>
              <Link
                href={stage.primaryHref}
                className="inline-flex h-8 items-center rounded-md bg-rose-800 px-3 text-xs font-bold text-white no-underline transition-colors hover:bg-rose-900"
              >
                {stage.primaryActionLabel}
              </Link>
            </div>
          );
        })}
      </div>

      {counts ? (
        <p className="mt-3 text-[11px] text-stone-400">
          {counts.totalOperators.toLocaleString()} salon operators in store · counts are approximate ·
          updated {new Date(counts.updatedAt).toLocaleString()}
        </p>
      ) : null}
    </section>
  );
}
