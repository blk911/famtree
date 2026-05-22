"use client";

import type { ReactNode } from "react";
import {
  CommunicationContextPane,
  CommunicationGrid,
  CommunicationMainPane,
  CommunicationListColumn,
} from "@/components/ui/msg-vault";

/** IG / iMessage-style 3-zone messenger shell (Agent 107). */
export function CommunicationShell({
  statusBar,
  list,
  main,
  context,
}: {
  statusBar: ReactNode;
  list: ReactNode;
  main: ReactNode;
  context: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-2">
      {statusBar}
      <CommunicationGrid>
        <CommunicationListColumn>{list}</CommunicationListColumn>
        <CommunicationMainPane>{main}</CommunicationMainPane>
        <CommunicationContextPane>{context}</CommunicationContextPane>
      </CommunicationGrid>
    </div>
  );
}
