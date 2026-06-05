"use client";

import type { TranspoPipelineStageId } from "@/lib/intelligence/transpo/pipeline/transpo-pipeline-config";
import { TRANSPO_PIPELINE_STAGES } from "@/lib/intelligence/transpo/pipeline/transpo-pipeline-config";

type Props = {
  currentStage: TranspoPipelineStageId;
  onStageSelect?: (stage: TranspoPipelineStageId) => void;
};

export function TranspoPipelineHeader({ currentStage, onStageSelect }: Props) {
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
      aria-label="Transpo intelligence pipeline"
    >
      {TRANSPO_PIPELINE_STAGES.map((stage) => {
        const active = stage.id === currentStage;
        const pillStyle: React.CSSProperties = {
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 14px",
          borderRadius: 10,
          border: active ? "2px solid #4338ca" : "1px solid #e7e5e4",
          background: active ? "#eef2ff" : "#fff",
          cursor: "pointer",
          boxShadow: active ? "0 1px 4px rgba(67,56,202,0.12)" : "none",
        };

        return (
          <button
            key={stage.id}
            type="button"
            onClick={() => onStageSelect?.(stage.id)}
            style={{
              ...pillStyle,
              border: pillStyle.border,
              font: "inherit",
            }}
            role="tab"
            aria-selected={active}
          >
            <span style={{ fontSize: 10, fontWeight: 800, color: active ? "#4338ca" : "#a8a29e" }}>
              {stage.order}
            </span>
            <span style={{ fontSize: 13, fontWeight: active ? 800 : 600, color: active ? "#1c1917" : "#57534e" }}>
              {stage.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
