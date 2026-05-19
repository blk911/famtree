"use client";

import { useEffect, useState } from "react";
import type { FlatNode } from "@/components/TreeList";
import { DashboardContextRail } from "@/components/dashboard/DashboardContextRail";
import { DashboardPrivateThreadCenter } from "@/components/dashboard/DashboardPrivateThreadCenter";
import type { SerializedDashboardPost } from "@/components/dashboard/DashboardPostsPanel";
import { directThreadKey } from "@/lib/private-thread-keys";
import { tuThreadKey } from "@/components/dashboard/private-thread-model";

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

export function PrivateThreadsHub({
  currentUserId,
  flat,
  totalMembers,
  trustUnits,
  bondPeers,
  membersForPrivate,
  serializedPrivatePosts,
  dmUnreadByPeerId,
  initialPeerId,
  initialUnitId,
  selectedThreadKey: controlledKey,
  onSelectedThreadKeyChange,
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
  const [uncontrolledKey, setUncontrolledKey] = useState<string | null>(null);
  const isControlled = controlledKey !== undefined;
  const selectedThreadKey = isControlled ? controlledKey : uncontrolledKey;
  const setSelectedThreadKey = (key: string | null) => {
    if (!isControlled) setUncontrolledKey(key);
    onSelectedThreadKeyChange?.(key);
  };

  useEffect(() => {
    if (selectedThreadKey) return;
    if (initialPeerId && initialPeerId !== currentUserId) {
      setSelectedThreadKey(directThreadKey(initialPeerId, currentUserId));
      return;
    }
    if (initialUnitId) {
      const unit = trustUnits.find((u) => u.id === initialUnitId);
      if (unit) setSelectedThreadKey(tuThreadKey(unit));
    }
  }, [initialPeerId, initialUnitId, currentUserId, trustUnits, selectedThreadKey]);

  return (
    <div className="thread-hub-grid">
      <DashboardPrivateThreadCenter
        currentUserId={currentUserId}
        trustUnits={trustUnits}
        posts={serializedPrivatePosts}
        members={membersForPrivate}
        bondPeers={bondPeers}
        selectedThreadKey={selectedThreadKey ?? null}
        onSelectedThreadKeyChange={setSelectedThreadKey}
      />
      <DashboardContextRail
        flat={flat}
        totalMembers={totalMembers}
        trustUnits={trustUnits}
        bondPeers={bondPeers}
        currentUserId={currentUserId}
        activePrivateThreadKey={selectedThreadKey ?? null}
        dmUnreadByPeerId={dmUnreadByPeerId}
        onSelectPrivateThread={setSelectedThreadKey}
      />
    </div>
  );
}
