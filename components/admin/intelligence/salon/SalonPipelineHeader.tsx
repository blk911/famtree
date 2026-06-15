"use client";

import Link from "next/link";
import type { SalonPipelineSummary, SalonPipelineStageId } from "@/lib/intelligence/salon/pipeline/pipeline-types";
import { SALON_PIPELINE_STAGES } from "@/lib/intelligence/salon/pipeline/salon-pipeline-config";
import { ADMIN_WORKSPACE_ROUTES } from "@/lib/admin/workspace-routes";

type SalonPipelineHeaderProps = {
  currentStage: SalonPipelineStageId;
  counts: SalonPipelineSummary | null;
  countsLoading?: boolean;
  onStageSelect?: (stage: SalonPipelineStageId) => void;
  /** When true, stage pills link to pipeline overview with stage hint */
  linkStagesToOverview?: boolean;
};

function stagePillClass(active: boolean): string {
  if (active) {
    return "inline-flex items-center gap-1.5 rounded-lg border border-rose-900 bg-rose-900 px-3 py-1.5 text-left shadow-sm";
  }
  return "inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-left hover:border-stone-300";
}

export function SalonPipelineHeader({
  currentStage,
  counts,
  countsLoading,
  onStageSelect,
  linkStagesToOverview = false,
}: SalonPipelineHeaderProps) {
  return (
    <div
      className="mb-2 flex flex-wrap items-stretch gap-2"
      role="tablist"
      aria-label="Salon intelligence pipeline"
    >
      {SALON_PIPELINE_STAGES.map((stage) => {
        const active = stage.id === currentStage;
        const count = counts ? counts[stage.id] : null;
        const inner = (
          <>
            <span
              className={`text-[10px] font-extrabold ${active ? "text-rose-200" : "text-stone-400"}`}
            >
              {stage.order}
            </span>
            <span
              className={`text-xs font-semibold sm:text-sm ${active ? "text-white" : "text-stone-700"}`}
            >
              {stage.label}
            </span>
            <span
              className={`ml-0.5 text-[11px] font-bold ${active ? "text-rose-100" : "text-stone-500"}`}
            >
              {countsLoading ? "…" : count != null ? `(${count.toLocaleString()})` : ""}
            </span>
          </>
        );

        if (linkStagesToOverview) {
          return (
            <Link
              key={stage.id}
              href={`${ADMIN_WORKSPACE_ROUTES.discovery}#${stage.id}`}
              className={`${stagePillClass(active)} no-underline`}
              role="tab"
              aria-selected={active}
            >
              {inner}
            </Link>
          );
        }

        return (
          <button
            key={stage.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onStageSelect?.(stage.id)}
            className={`${stagePillClass(active)} cursor-pointer font-[inherit]`}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}
