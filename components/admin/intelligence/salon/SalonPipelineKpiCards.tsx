"use client";

import Link from "next/link";
import { SALON_PIPELINE_STAGES } from "@/lib/intelligence/salon/pipeline/salon-pipeline-config";
import type { SalonPipelineSummary } from "@/lib/intelligence/salon/pipeline/pipeline-types";

type Props = {
  counts: SalonPipelineSummary | null;
  countsLoading?: boolean;
};

export function SalonPipelineKpiCards({ counts, countsLoading }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {SALON_PIPELINE_STAGES.map((stage) => {
        const count = counts?.[stage.id];
        return (
          <Link
            key={stage.id}
            id={stage.id}
            href={stage.primaryHref}
            className="group flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 no-underline shadow-sm transition-colors hover:border-stone-300 hover:bg-stone-50"
          >
            <span className="text-xs font-semibold text-stone-600 group-hover:text-stone-900">
              {stage.label}
            </span>
            <span className="text-lg font-extrabold leading-none text-stone-900">
              {countsLoading ? "…" : (count ?? 0).toLocaleString()}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
