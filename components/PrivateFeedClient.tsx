"use client";

/**
 * Legacy export — private threads use the dashboard selector + center panel model.
 * @see PrivateThreadsHub
 */
import { PrivateThreadsHub } from "@/components/dashboard/PrivateThreadsHub";

type TrustUnit = {
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

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
};

export function PrivateFeedClient({
  currentUserId,
  trustUnits,
  posts,
  members,
  bondPeers,
  initialUnitId,
  initialPeerId,
}: {
  currentUserId: string;
  trustUnits: TrustUnit[];
  posts: Parameters<typeof PrivateThreadsHub>[0]["serializedPrivatePosts"];
  members: Member[];
  bondPeers: Member[];
  initialUnitId?: string;
  initialPeerId?: string;
  launchDmPeerId?: string | null;
  onLaunchDmPeerConsumed?: () => void;
  onActiveDirectPeerChange?: (peerId: string | null) => void;
}) {
  return (
    <PrivateThreadsHub
      currentUserId={currentUserId}
      flat={[]}
      totalMembers={members.length}
      trustUnits={trustUnits}
      bondPeers={bondPeers}
      membersForPrivate={members}
      serializedPrivatePosts={posts}
      dmUnreadByPeerId={{}}
      initialPeerId={initialPeerId}
      initialUnitId={initialUnitId}
    />
  );
}
