import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BondFamilyRow } from "@/components/family-vault/BondFamilyRow";
import { FamilyUnitsTrustCard } from "@/components/family-vault/FamilyUnitsTrustCard";
import { PendingTrustUnitLineCard } from "@/components/family-vault/PendingTrustUnitLineCard";
import { DraftTrustCirclesBanner } from "@/components/trust/DraftTrustCirclesBanner";
import {
  loadTrustUnitsSafe,
  loadBondDetailsSafe,
  loadPendingTrustRequestsSafe,
} from "@/lib/tree/safe-data";
import { trustRequestMembersForClient, type PendingTrustRequestMember } from "@/lib/trust";
import {
  countDraftTrustUnits,
  getActiveTrustUnits,
  type TrustUnitLike,
} from "@/lib/trust/display";

export default async function FamilyUnitsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [trustUnits, bondDetails, pendingTuRequests] = await Promise.all([
    loadTrustUnitsSafe(user.id),
    loadBondDetailsSafe(user.id),
    loadPendingTrustRequestsSafe(user.id),
  ]);

  const activeUnitIds = new Set(
    getActiveTrustUnits(trustUnits as TrustUnitLike[], user.id).map((u) => u.id),
  );
  const activeTrustUnits = trustUnits.filter((u) => activeUnitIds.has(u.id));
  const draftTrustCount = countDraftTrustUnits(trustUnits as TrustUnitLike[], user.id);

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
  const hasLiveTu = activeTrustUnits.length > 0;
  const hasBonds = bondDetails.length > 0;

  return (
    <div className="app-page-body">
      <section className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight text-stone-900">Trust units forming</h2>
        {!hasPendingTu ? (
          <p className="text-sm text-stone-500 m-0">
            No proposals right now. When your group can form a circle, you&apos;ll see it here and on the dashboard.
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
        <h2 className="text-lg font-bold tracking-tight text-stone-900">Trust circles</h2>
        {!hasLiveTu && draftTrustCount === 0 ? (
          <p className="text-sm text-stone-500 m-0">
            No active trust circles yet. Invite someone or accept a proposal to get started.
          </p>
        ) : (
          <div className="flex max-w-2xl flex-col gap-2">
            {activeTrustUnits.map((unit) => (
              <FamilyUnitsTrustCard
                key={unit.id}
                unit={{
                  id: unit.id,
                  createdAt: unit.createdAt.toISOString(),
                  members: unit.members,
                }}
              />
            ))}
            {draftTrustCount > 0 && <DraftTrustCirclesBanner draftCount={draftTrustCount} />}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight text-stone-900">Bonds</h2>
        {!hasBonds ? (
          <p className="text-sm text-stone-500 m-0">
            No sponsor bonds yet. They appear when someone joins through your invite.
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
