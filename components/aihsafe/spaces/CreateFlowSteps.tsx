"use client";

import type { ReactNode } from "react";

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
    <div className="aihsafe-create-flow">
      <div className="aihsafe-create-flow__progress" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`aihsafe-create-flow__dot${i + 1 <= step ? " aihsafe-create-flow__dot--on" : ""}`}
          />
        ))}
      </div>
      <p className="aihsafe-create-flow__step-label">
        Step {step} of {total}
      </p>
      <h3 className="aihsafe-create-flow__title">{title}</h3>
      <div className="aihsafe-create-flow__body">{children}</div>
      <div className="aihsafe-create-flow__footer">{footer}</div>
    </div>
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
