"use client";

import { ContextRailSection } from "./ContextRailSection";

export function ContextRailActivityCard({
  hint,
  onSeeActivity,
}: {
  hint: string;
  onSeeActivity?: () => void;
}) {
  return (
    <ContextRailSection title="Recent activity">
      <p style={{ fontSize: 11, color: "#57534e", margin: "0 0 8px", lineHeight: 1.45 }}>{hint}</p>
      {onSeeActivity && (
        <button
          type="button"
          onClick={onSeeActivity}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            fontSize: 11,
            fontWeight: 600,
            color: "#6366f1",
            cursor: "pointer",
          }}
        >
          Open activity →
        </button>
      )}
    </ContextRailSection>
  );
}
