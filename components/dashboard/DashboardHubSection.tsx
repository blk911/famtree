"use client";

import { useState } from "react";
import {
  DashboardVaultTabs,
  type DashboardTabId,
} from "@/components/dashboard/DashboardVaultTabs";
import { DashboardTrustUnitGate } from "@/components/dashboard/DashboardTrustUnitGate";
import { DashboardContextRail } from "@/components/dashboard/DashboardContextRail";
import type { FlatNode } from "@/components/TreeList";
import type { SerializedDashboardPost } from "@/components/dashboard/DashboardPostsPanel";
import type { TuModalRequest } from "@/components/dashboard/TrustUnitFormationModal";

type ComposerSpace = { id: string; kind: "BUSINESS" | "CLUB" | "CHURCH"; name: string | null };

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

interface Props {
  currentUserId: string;
  lastSeenAt: string | null;
  newPostsCount: number;
  newCommentsCount: number;
  invites: SerializedInvite[];
  composerSpaces: ComposerSpace[];
  serializedFeedPosts: SerializedDashboardPost[];
  serializedPrivatePosts: SerializedDashboardPost[];
  serializedMyPosts: SerializedDashboardPost[];
  trustUnits: TrustUnitRow[];
  membersForPrivate: PrivateMember[];
  bondPeers: PrivateMember[];
  vaultNotificationCount: number;
  initialRequests: TuModalRequest[];
  flat: FlatNode[];
  totalMembers: number;
}

export function DashboardHubSection({
  currentUserId,
  lastSeenAt,
  newPostsCount,
  newCommentsCount,
  invites,
  composerSpaces,
  serializedFeedPosts,
  serializedPrivatePosts,
  serializedMyPosts,
  trustUnits,
  membersForPrivate,
  bondPeers,
  vaultNotificationCount,
  initialRequests,
  flat,
  totalMembers,
}: Props) {
  const [tab, setTab] = useState<DashboardTabId>("posts");
  const hideContextRail = tab === "private-threads";

  return (
    <div
      className={`grid gap-4 items-start ${
        hideContextRail
          ? "grid-cols-1"
          : "grid-cols-[minmax(0,1fr)_232px] max-[860px]:grid-cols-1"
      }`}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <DashboardTrustUnitGate initialRequests={initialRequests} currentUserId={currentUserId} />
        <DashboardVaultTabs
          tab={tab}
          onTabChange={setTab}
          currentUserId={currentUserId}
          lastSeenAt={lastSeenAt}
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

      {!hideContextRail && (
        <DashboardContextRail flat={flat} totalMembers={totalMembers} trustUnits={trustUnits} />
      )}
    </div>
  );
}
