"use client";

import { useCallback, useMemo, useState } from "react";
import type { FlatNode } from "@/components/TreeList";
import type { TuModalRequest } from "@/components/dashboard/TrustUnitFormationModal";
import { DashboardActivityCtaStrip } from "@/components/dashboard/DashboardActivityCtaStrip";
import { DashboardHubColumns } from "@/components/dashboard/DashboardHubColumns";
import type { SerializedDashboardPost } from "@/components/dashboard/DashboardPostsPanel";
import type { DashboardTabId } from "@/components/dashboard/DashboardVaultTabs";

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

export function DashboardMemberLayout({
  currentUserId,
  currentUserRole,
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
  const [tab, setTab] = useState<DashboardTabId>("posts");

  const pendingInvitesCount = useMemo(
    () => invites.filter((i) => i.status === "PENDING").length,
    [invites],
  );

  const privateThreadsCount = useMemo(() => {
    const dmUnread = Object.values(dmUnreadByPeerId).reduce((sum, n) => sum + n, 0);
    return Math.max(newCommentsCount, dmUnread);
  }, [dmUnreadByPeerId, newCommentsCount]);

  const handleTabChange = useCallback((next: DashboardTabId) => setTab(next), []);

  return (
    <div className="dashboard-member-stack">
      <DashboardActivityCtaStrip
        activeTab={tab}
        onSelectTab={handleTabChange}
        newPostsCount={newPostsCount}
        privateThreadsCount={privateThreadsCount}
        pendingInvitesCount={pendingInvitesCount}
        vaultNotificationCount={vaultNotificationCount}
      />
      <DashboardHubColumns
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        tab={tab}
        onTabChange={handleTabChange}
        initialRequests={initialRequests}
        lastSeenAt={lastSeenAt}
        dmUnreadByPeerId={dmUnreadByPeerId}
        flat={flat}
        totalMembers={totalMembers}
        trustUnits={trustUnits}
        newPostsCount={newPostsCount}
        newCommentsCount={newCommentsCount}
        invites={invites}
        composerSpaces={composerSpaces}
        serializedFeedPosts={serializedFeedPosts}
        serializedPrivatePosts={serializedPrivatePosts}
        serializedMyPosts={serializedMyPosts}
        membersForPrivate={membersForPrivate}
        bondPeers={bondPeers}
        vaultNotificationCount={vaultNotificationCount}
      />
    </div>
  );
}
