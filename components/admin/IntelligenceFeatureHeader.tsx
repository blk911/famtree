"use client";
// components/admin/IntelligenceFeatureHeader.tsx
// Feature title + helper + vertical context (no in-page vertical selector).

import { IntelligenceContextBadge } from "./IntelligenceContextBadge";
import type { VerticalConfig } from "@/lib/intelligence/core/vertical-config";

type Props = {
  title: string;
  description?: string;
  config: VerticalConfig;
  /** When false, hides Active vertical / Data scope strip (nav already sets context). */
  showContext?: boolean;
};

export function IntelligenceFeatureHeader({ title, description, config, showContext = true }: Props) {
  return (
    <div style={{ marginBottom: showContext ? 24 : 12 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
        {title}
      </h1>
      {description ? (
        <p style={{ fontSize: 13, color: "#78716c", margin: "0 0 0", maxWidth: 720, lineHeight: 1.55 }}>
          {description}
        </p>
      ) : null}
      {showContext ? (
        <IntelligenceContextBadge
          verticalLabel={config.label}
          dataScope={config.dataScope}
        />
      ) : null}
    </div>
  );
}
