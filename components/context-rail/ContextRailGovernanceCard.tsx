"use client";

import { ContextRailSection, ContextRailMetaList } from "./ContextRailSection";

export function ContextRailGovernanceCard({
  settingsLabel,
  shellMode,
  canEdit,
  pendingApprovals,
  items,
}: {
  settingsLabel: string;
  shellMode: "founder" | "member" | "child";
  canEdit: boolean;
  pendingApprovals: number;
  items: Array<{ label: string; value: string }>;
}) {
  const childView = shellMode === "child";

  return (
    <ContextRailSection title={settingsLabel} count={pendingApprovals > 0 ? pendingApprovals : undefined}>
      <ContextRailMetaList
        items={[
          ...items,
          {
            label: childView ? "Your view" : "Your role",
            value: childView ? "Boundaries (read-only)" : canEdit ? "Can edit rules" : "View only",
          },
        ]}
      />
      {pendingApprovals > 0 && (
        <p style={{ fontSize: 11, color: "#b45309", margin: "8px 0 0", fontWeight: 600 }}>
          {pendingApprovals} pending approval{pendingApprovals === 1 ? "" : "s"}
        </p>
      )}
    </ContextRailSection>
  );
}
