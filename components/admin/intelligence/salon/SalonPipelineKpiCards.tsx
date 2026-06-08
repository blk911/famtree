"use client";

import Link from "next/link";
import {
  DISCOVERY_FLOW_STAGES,
  discoveryFlowCountForStage,
} from "@/lib/intelligence/salon/discovery-flow-config";
import type { SalonPipelineSummary } from "@/lib/intelligence/salon/pipeline/pipeline-types";

type Props = {
  counts: SalonPipelineSummary | null;
  countsLoading?: boolean;
};

export function SalonPipelineKpiCards({ counts, countsLoading }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {DISCOVERY_FLOW_STAGES.map((stage) => {
        const count = discoveryFlowCountForStage(stage, counts);
        const isRuns = stage.auditStyle;

        return (
          <Link
            key={stage.id}
            id={stage.id}
            href={stage.primaryHref}
            className={[
              "group flex items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 no-underline shadow-sm transition-colors",
              isRuns
                ? "border-dashed border-stone-300 hover:border-stone-400 hover:bg-stone-50"
                : "border-stone-200 hover:border-stone-300 hover:bg-stone-50",
            ].join(" ")}
          >
            <span
              className={[
                "text-xs font-semibold",
                isRuns ? "text-stone-500 group-hover:text-stone-700" : "text-stone-600 group-hover:text-stone-900",
              ].join(" ")}
            >
              {stage.label}
            </span>
            <span
              className={[
                "text-lg font-extrabold leading-none",
                isRuns ? "text-stone-500" : "text-stone-900",
              ].join(" ")}
            >
              {countsLoading || count === null ? (countsLoading ? "…" : "—") : count.toLocaleString()}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
