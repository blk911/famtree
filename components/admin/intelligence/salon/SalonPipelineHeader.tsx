"use client";

import Link from "next/link";
import type { SalonPipelineSummary, SalonPipelineStageId } from "@/lib/intelligence/salon/pipeline/pipeline-types";
import { SALON_PIPELINE_STAGES } from "@/lib/intelligence/salon/pipeline/salon-pipeline-config";

type SalonPipelineHeaderProps = {
  currentStage: SalonPipelineStageId;
  counts: SalonPipelineSummary | null;
  countsLoading?: boolean;
  onStageSelect?: (stage: SalonPipelineStageId) => void;
  /** When true, stage pills link to pipeline overview with stage hint */
  linkStagesToOverview?: boolean;
};

export function SalonPipelineHeader({
  currentStage,
  counts,
  countsLoading,
  onStageSelect,
  linkStagesToOverview = false,
}: SalonPipelineHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        alignItems: "stretch",
        marginBottom: 10,
      }}
      role="tablist"
      aria-label="Salon intelligence pipeline"
    >
      {SALON_PIPELINE_STAGES.map((stage) => {
        const active = stage.id === currentStage;
        const count = counts ? counts[stage.id] : null;
        const inner = (
          <>
            <span style={{ fontSize: 10, fontWeight: 800, color: active ? "#9d174d" : "#a8a29e" }}>
              {stage.order}
            </span>
            <span style={{ fontSize: 13, fontWeight: active ? 800 : 600, color: active ? "#1c1917" : "#57534e" }}>
              {stage.label}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: active ? "#9d174d" : "#78716c",
                marginLeft: 2,
              }}
            >
              {countsLoading ? "…" : count != null ? `(${count.toLocaleString()})` : ""}
            </span>
          </>
        );

        const pillStyle: React.CSSProperties = {
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 14px",
          borderRadius: 10,
          border: active ? "2px solid #9d174d" : "1px solid #e7e5e4",
          background: active ? "#fdf2f8" : "#fff",
          textDecoration: "none",
          cursor: "pointer",
          boxShadow: active ? "0 1px 4px rgba(157,23,77,0.12)" : "none",
        };

        if (linkStagesToOverview) {
          return (
            <Link
              key={stage.id}
              href={`/admin/studios#${stage.id}`}
              style={pillStyle}
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
            style={{
              ...pillStyle,
              fontFamily: "inherit",
            }}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}
