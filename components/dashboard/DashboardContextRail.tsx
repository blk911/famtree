"use client";

import { ContextRail, DashboardRailProfile } from "@/components/context-rail";
import type { DashboardRailProps } from "@/components/context-rail";

/** Dashboard right rail — shared contextual rail (Agent 78). */
export function DashboardContextRail(props: DashboardRailProps) {
  return (
    <ContextRail mode="dashboard">
      <DashboardRailProfile {...props} />
    </ContextRail>
  );
}
