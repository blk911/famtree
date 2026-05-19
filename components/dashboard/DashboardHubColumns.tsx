"use client";

import { useCallback, useState } from "react";
import type { FlatNode } from "@/components/TreeList";
import type { TuModalRequest } from "@/components/dashboard/TrustUnitFormationModal";
import { DashboardTrustUnitGate } from "@/components/dashboard/DashboardTrustUnitGate";
import {
  DashboardVaultTabs,
  type DashboardTabId,
} from "@/components/dashboard/DashboardVaultTabs";
import { DashboardContextRail } from "@/components/dashboard/DashboardContextRail";
import type { SerializedDashboardPost } from "@/components/dashboard/DashboardPostsPanel";

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
  dmUnreadByPeerId,
  flat,
  totalMembers,
  trustUnits,
  newPostsCount,
  newCommentsCount,
  invites,
  composerSpaces,
  serializedFeedPosts,
  serializedPrivatePosts,
  serializedMyPosts,
  membersForPrivate,
  bondPeers,
  vaultNotificationCount,
}: {
  currentUserId: string;
  currentUserRole: string;
  tab: DashboardTabId;
  onTabChange: (tab: DashboardTabId) => void;
  initialRequests: TuModalRequest[];
  lastSeenAt: string | null;
  dmUnreadByPeerId: Record<string, number>;
  flat: FlatNode[];
  totalMembers: number;
  trustUnits: TrustUnitRow[];
  newPostsCount: number;
  newCommentsCount: number;
  invites: SerializedInvite[];
  composerSpaces: ComposerSpace[];
  serializedFeedPosts: SerializedDashboardPost[];
  serializedPrivatePosts: SerializedDashboardPost[];
  serializedMyPosts: SerializedDashboardPost[];
  membersForPrivate: PrivateMember[];
  bondPeers: PrivateMember[];
  vaultNotificationCount: number;
}) {
  const tab = controlledTab;
  const setTab = onTabChange;
  const [activePrivateThreadKey, setActivePrivateThreadKey] = useState<string | null>(null);

  const handleSelectPrivateThread = useCallback((threadKey: string) => {
    setActivePrivateThreadKey(threadKey);
    setTab("pvt-feeds");
  }, [setTab]);

  return (
    <div className="thread-hub-grid">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
          selectedPrivateThreadKey={activePrivateThreadKey}
          onSelectedPrivateThreadKeyChange={setActivePrivateThreadKey}
          newPostsCount={newPostsCount}
          newCommentsCount={newCommentsCount}
          invites={invites}
          composerSpaces={composerSpaces}
          serializedFeedPosts={serializedFeedPosts}
          serializedPrivatePosts={serializedPrivatePosts}
          serializedMyPosts={serializedMyPosts}
          trustUnits={trustUnits}
          membersForPrivate={membersForPrivate}
          bondPeers={bondPeers}
          vaultNotificationCount={vaultNotificationCount}
        />
      </div>
      <DashboardContextRail
        flat={flat}
        totalMembers={totalMembers}
        trustUnits={trustUnits}
        bondPeers={bondPeers}
        currentUserId={currentUserId}
        activePrivateThreadKey={activePrivateThreadKey}
        dmUnreadByPeerId={dmUnreadByPeerId}
        onSelectPrivateThread={handleSelectPrivateThread}
      />
    </div>
  );
}
