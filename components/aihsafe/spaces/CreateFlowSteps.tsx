"use client";

import type { ReactNode } from "react";
import {
  AihsafeCreateFlow,
  AihsafeCreateFlowDot,
  AihsafeCreateFlowFooter,
  AihsafeCreateFlowProgress,
  AihsafeCreateFlowStepLabel,
  AihsafeCreateFlowTitle,
} from "@/components/ui/aihsafe";

export function CreateFlowSteps({
  step,
  total,
  title,
  children,
  footer,
}: {
  step: number;
  total: number;
  title: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <AihsafeCreateFlow>
      <AihsafeCreateFlowProgress aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <AihsafeCreateFlowDot key={i} on={i + 1 <= step} />
        ))}
      </AihsafeCreateFlowProgress>
      <AihsafeCreateFlowStepLabel>
        Step {step} of {total}
      </AihsafeCreateFlowStepLabel>
      <AihsafeCreateFlowTitle>{title}</AihsafeCreateFlowTitle>
      <div>{children}</div>
      <AihsafeCreateFlowFooter>{footer}</AihsafeCreateFlowFooter>
    </AihsafeCreateFlow>
  );
}

export const createFlowInput: React.CSSProperties = {
  width:        "100%",
  padding:      "10px 13px",
  borderRadius: 10,
  border:       "1px solid #d6d3d1",
  fontSize:     14,
  background:   "#fafaf9",
  outline:      "none",
  boxSizing:    "border-box",
};

export const createFlowPrimaryBtn: React.CSSProperties = {
  background:   "#7c3aed",
  color:        "#fff",
  borderRadius: 10,
  padding:      "10px 18px",
  border:       "none",
  fontSize:     14,
  fontWeight:   600,
  cursor:       "pointer",
};

export const createFlowSecondaryBtn: React.CSSProperties = {
  background:   "transparent",
  color:        "#57534e",
  borderRadius: 10,
  padding:      "10px 14px",
  border:       "1px solid #e7e5e4",
  fontSize:     14,
  fontWeight:   600,
  cursor:       "pointer",
};
