"use client";

import { useEffect } from "react";
import type { FlatNode } from "@/components/TreeList";
import { DashboardContextRail } from "@/components/dashboard/DashboardContextRail";
import { HubGrid, HubGridMain, HubGridRail } from "@/components/ui/hub-grid";
import { DashboardPrivateThreadCenter } from "@/components/dashboard/DashboardPrivateThreadCenter";
import type { SerializedDashboardPost } from "@/components/dashboard/DashboardPostsPanel";
import {
  DashboardPrivateThreadsProvider,
  useDashboardPrivateThreads,
} from "@/components/vault/DashboardPrivateThreadsContext";

type TrustUnitRow = {
  id: string;
  members: Array<{
    user: { id: string; firstName: string; lastName: string; photoUrl: string | null };
  }>;
};

type PrivateMember = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
};

function PrivateThreadsHubInner({
  currentUserId,
  flat,
  totalMembers,
  trustUnits,
  bondPeers,
  initialPeerId,
  initialUnitId,
}: {
  currentUserId: string;
  flat: FlatNode[];
  totalMembers: number;
  trustUnits: TrustUnitRow[];
  bondPeers: PrivateMember[];
  initialPeerId?: string;
  initialUnitId?: string;
}) {
  const { openDirectPeer, openTrustUnit } = useDashboardPrivateThreads();

  useEffect(() => {
    if (initialPeerId && initialPeerId !== currentUserId) {
      void openDirectPeer(initialPeerId);
      return;
    }
    if (initialUnitId) {
      const unit = trustUnits.find((u) => u.id === initialUnitId);
      if (unit) void openTrustUnit(unit);
    }
  }, [initialPeerId, initialUnitId, currentUserId, trustUnits, openDirectPeer, openTrustUnit]);

  return (
    <HubGrid>
      <HubGridMain>
        <DashboardPrivateThreadCenter currentUserId={currentUserId} />
      </HubGridMain>
      <HubGridRail>
        <DashboardContextRail
          flat={flat}
          totalMembers={totalMembers}
          trustUnits={trustUnits}
          bondPeers={bondPeers}
          currentUserId={currentUserId}
        />
      </HubGridRail>
    </HubGrid>
  );
}

export function PrivateThreadsHub({
  currentUserId,
  flat,
  totalMembers,
  trustUnits,
  bondPeers,
  membersForPrivate: _membersForPrivate,
  serializedPrivatePosts: _serializedPrivatePosts,
  dmUnreadByPeerId: _dmUnreadByPeerId,
  initialPeerId,
  initialUnitId,
  selectedThreadKey: _selectedThreadKey,
  onSelectedThreadKeyChange: _onSelectedThreadKeyChange,
}: {
  currentUserId: string;
  flat: FlatNode[];
  totalMembers: number;
  trustUnits: TrustUnitRow[];
  bondPeers: PrivateMember[];
  membersForPrivate: PrivateMember[];
  serializedPrivatePosts: SerializedDashboardPost[];
  dmUnreadByPeerId: Record<string, number>;
  initialPeerId?: string;
  initialUnitId?: string;
  selectedThreadKey?: string | null;
  onSelectedThreadKeyChange?: (key: string | null) => void;
}) {
  return (
    <DashboardPrivateThreadsProvider currentUserId={currentUserId} trustUnits={trustUnits}>
      <PrivateThreadsHubInner
        currentUserId={currentUserId}
        flat={flat}
        totalMembers={totalMembers}
        trustUnits={trustUnits}
        bondPeers={bondPeers}
        initialPeerId={initialPeerId}
        initialUnitId={initialUnitId}
      />
    </DashboardPrivateThreadsProvider>
  );
}
