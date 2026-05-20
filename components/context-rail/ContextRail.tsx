"use client";

import type { ContextRailProps } from "./types";

const MODE_LABELS: Record<ContextRailProps["mode"], string> = {
  dashboard:  "Dashboard context",
  network:    "Network context",
  governance: "Family Safe context",
  vault:      "Msg Vault context",
};

export function ContextRail({ mode, children, className }: ContextRailProps) {
  return (
    <aside
      className={`context-rail context-rail--${mode}${className ? ` ${className}` : ""}`}
      aria-label={MODE_LABELS[mode]}
      data-context-rail-mode={mode}
    >
      {children}
    </aside>
  );
}
