"use client";

import type { ReactNode } from "react";
import { ContextRail } from "./ContextRail";
import { NetworkRailProfile } from "./profiles/NetworkRailProfile";
import type { NetworkRailProps } from "./types";
import { HubGrid, HubGridMain, HubGridRail } from "@/components/ui/hub-grid";

export function NetworkPageLayout({
  children,
  rail,
}: {
  children: ReactNode;
  rail: NetworkRailProps;
}) {
  return (
    <div className="app-page-body flex w-full flex-col gap-5">
      <HubGrid>
        <HubGridMain>{children}</HubGridMain>
        <HubGridRail>
        <ContextRail mode="network">
          <NetworkRailProfile {...rail} />
        </ContextRail>
        </HubGridRail>
      </HubGrid>
    </div>
  );
}
