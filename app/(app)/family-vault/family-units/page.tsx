import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BondFamilyRow } from "@/components/family-vault/BondFamilyRow";
import { FamilyUnitsTrustCard } from "@/components/family-vault/FamilyUnitsTrustCard";
import { PendingTrustUnitLineCard } from "@/components/family-vault/PendingTrustUnitLineCard";
import {
  loadTrustUnitsSafe,
  loadBondDetailsSafe,
  loadPendingTrustRequestsSafe,
} from "@/lib/tree/safe-data";
import { trustRequestMembersForClient, type PendingTrustRequestMember } from "@/lib/trust";

export default async function FamilyUnitsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [trustUnits, bondDetails, pendingTuRequests] = await Promise.all([
    loadTrustUnitsSafe(user.id),
    loadBondDetailsSafe(user.id),
    loadPendingTrustRequestsSafe(user.id),
  ]);

  const currentMini = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    photoUrl: user.photoUrl,
  };

  const serializedPendingTu = pendingTuRequests.map((r: {
    id: string;
    createdAt: Date;
    createdBy: {
      id: string;
      firstName: string;
      lastName: string;
      photoUrl: string | null;
    };
    members: PendingTrustRequestMember[];
  }) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    createdBy: r.createdBy,
    members: trustRequestMembersForClient(r.members),
  }));

  const hasPendingTu = serializedPendingTu.length > 0;
  const hasLiveTu = trustUnits.length > 0;
  const hasBonds = bondDetails.length > 0;

  return (
    <div className="content-col space-y-10 pb-10">
      <p className="rounded-xl border border-stone-200 bg-stone-50/80 px-4 py-3 text-sm text-stone-600 leading-snug">
        <strong className="text-stone-900">Invite-only:</strong> every member has a{" "}
        <strong className="text-stone-900">sponsor</strong> downhill connection from whoever invited them.{" "}
        <strong className="text-stone-900">Bonds</strong> capture those sponsor links;{" "}
        <strong className="text-stone-900">trust units</strong> form when aligned members agree to a shared unit on top.
        Messages open in <span className="font-medium text-stone-800">Private Threads</span>.
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight text-stone-900">Trust units forming</h2>
        {!hasPendingTu ? (
          <p className="text-sm text-stone-500">
            Nothing pending. When an invite surfaces a triangle your group can form, everyone gets a dashboard modal to
            accept or hold.
          </p>
        ) : (
          <div className="flex max-w-2xl flex-col gap-2">
            {serializedPendingTu.map((req) => (
              <PendingTrustUnitLineCard key={req.id} request={req} viewerId={user.id} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight text-stone-900">Trust units (live)</h2>
        {!hasLiveTu ? (
          <p className="text-sm text-stone-500">
            No active trust unit yet. When everyone accepts a proposal, it appears here with the sponsor noted on the
            collapsed row where available.
          </p>
        ) : (
          <div className="flex max-w-2xl flex-col gap-2">
            {trustUnits.map((unit) => (
              <FamilyUnitsTrustCard
                key={unit.id}
                unit={{
                  id: unit.id,
                  createdAt: unit.createdAt.toISOString(),
                  members: unit.members,
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight text-stone-900">Bonds</h2>
        {!hasBonds ? (
          <p className="text-sm text-stone-500">
            No accepted bonds yet. Invite registration creates a sponsor bond automatically when you join through an
            invite.
          </p>
        ) : (
          <div className="flex max-w-2xl flex-col gap-2">
            {bondDetails.map(({ peer, bondedAt }) => (
              <BondFamilyRow
                key={peer.id}
                self={currentMini}
                peer={{
                  id: peer.id,
                  firstName: peer.firstName,
                  lastName: peer.lastName,
                  photoUrl: peer.photoUrl,
                }}
                bondedAt={bondedAt.toISOString()}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
