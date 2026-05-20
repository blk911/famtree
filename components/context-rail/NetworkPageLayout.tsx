"use client";

import type { ReactNode } from "react";
import { ContextRail } from "./ContextRail";
import { NetworkRailProfile } from "./profiles/NetworkRailProfile";
import type { NetworkRailProps } from "./types";

export function NetworkPageLayout({
  children,
  rail,
}: {
  children: ReactNode;
  rail: NetworkRailProps;
}) {
  return (
    <div className="app-page-body dashboard-body thread-hub-grid">
      <div className="dashboard-body__main thread-hub-grid__main">{children}</div>
      <div className="dashboard-body__rail thread-hub-grid__rail">
        <ContextRail mode="network">
          <NetworkRailProfile {...rail} />
        </ContextRail>
      </div>
    </div>
  );
}
