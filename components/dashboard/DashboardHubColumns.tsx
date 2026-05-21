"use client";

import { useCallback } from "react";
import type { FlatNode } from "@/components/TreeList";
import type { TuModalRequest } from "@/components/dashboard/TrustUnitFormationModal";
import { DashboardTrustUnitGate } from "@/components/dashboard/DashboardTrustUnitGate";
import {
  DashboardVaultTabs,
  type DashboardTabId,
} from "@/components/dashboard/DashboardVaultTabs";
import { DashboardContextRail } from "@/components/dashboard/DashboardContextRail";
import { DashboardPrivateThreadsProvider } from "@/components/vault/DashboardPrivateThreadsContext";
import type { SerializedDashboardPost } from "@/components/dashboard/DashboardPostsPanel";
import { HubGrid, HubGridMainColumn, HubGridRail } from "@/components/ui/hub-grid";

type ComposerSpace = {
  id: string;
  kind: "BUSINESS" | "CLUB" | "CHURCH";
  name: string | null;
};

interface SerializedInvite {
  id: string;
  recipientEmail: string;
  status: string;
  createdAt: string;
}

type TrustUnitRow = {
  id: string;
  members: Array<{
    user: {
      id: string;
      firstName: string;
      lastName: string;
      photoUrl: string | null;
    };
  }>;
};

type PrivateMember = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
};

export function DashboardHubColumns({
  currentUserId,
  currentUserRole,
  tab: controlledTab,
  onTabChange,
  initialRequests,
  lastSeenAt,
  flat,
  totalMembers,
  trustUnits,
  newPostsCount,
  newCommentsCount,
  invites,
  composerSpaces,
  serializedFeedPosts,
  serializedMyPosts,
  membersForPrivate,
  bondPeers,
  vaultNotificationCount,
  serializedPrivatePosts: _serializedPrivatePosts,
  dmUnreadByPeerId: _dmUnreadByPeerId,
}: {
  currentUserId: string;
  currentUserRole: string;
  tab: DashboardTabId;
  onTabChange: (tab: DashboardTabId) => void;
  initialRequests: TuModalRequest[];
  lastSeenAt: string | null;
  flat: FlatNode[];
  totalMembers: number;
  trustUnits: TrustUnitRow[];
  newPostsCount: number;
  newCommentsCount: number;
  invites: SerializedInvite[];
  composerSpaces: ComposerSpace[];
  serializedFeedPosts: SerializedDashboardPost[];
  serializedMyPosts: SerializedDashboardPost[];
  membersForPrivate: PrivateMember[];
  bondPeers: PrivateMember[];
  vaultNotificationCount: number;
  serializedPrivatePosts?: SerializedDashboardPost[];
  dmUnreadByPeerId?: Record<string, number>;
}) {
  const tab = controlledTab;
  const setTab = onTabChange;

  const handlePrivateTabSelect = useCallback(() => {
    setTab("pvt-feeds");
  }, [setTab]);

  return (
    <DashboardPrivateThreadsProvider
      currentUserId={currentUserId}
      trustUnits={trustUnits}
      onPrivateTabSelect={handlePrivateTabSelect}
    >
      <HubGrid>
        <HubGridMainColumn>
          <DashboardTrustUnitGate
            initialRequests={initialRequests}
            currentUserId={currentUserId}
          />
          <DashboardVaultTabs
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            tab={tab}
            onTabChange={setTab}
            lastSeenAt={lastSeenAt}
            newPostsCount={newPostsCount}
            newCommentsCount={newCommentsCount}
            invites={invites}
            composerSpaces={composerSpaces}
            serializedFeedPosts={serializedFeedPosts}
            serializedPrivatePosts={[]}
            serializedMyPosts={serializedMyPosts}
            trustUnits={trustUnits}
            membersForPrivate={membersForPrivate}
            bondPeers={bondPeers}
            vaultNotificationCount={vaultNotificationCount}
          />
        </HubGridMainColumn>
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
    </DashboardPrivateThreadsProvider>
  );
}
