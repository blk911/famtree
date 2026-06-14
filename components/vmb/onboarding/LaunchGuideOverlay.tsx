"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function LaunchGuideOverlay({ children }: Props) {
  return (
    <div className="vmb-launch-guide-overlay" aria-live="polite">
      <div className="vmb-launch-guide-overlay__panel">{children}</div>
    </div>
  );
}
