import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BondFamilyRow } from "@/components/family-vault/BondFamilyRow";
import { FamilyUnitsTrustCard } from "@/components/family-vault/FamilyUnitsTrustCard";
import { loadTrustUnitsSafe, loadBondDetailsSafe } from "@/lib/tree/safe-data";

export default async function FamilyUnitsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [trustUnits, bondDetails] = await Promise.all([
    loadTrustUnitsSafe(user.id),
    loadBondDetailsSafe(user.id),
  ]);

  const currentMini = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    photoUrl: user.photoUrl,
  };

  const hasTus = trustUnits.length > 0;
  const hasBonds = bondDetails.length > 0;

  return (
    <div className="content-col space-y-10 pb-10">
      <p className="rounded-xl border border-stone-200 bg-stone-50/80 px-4 py-3 text-sm text-stone-600 leading-snug">
        <strong className="text-stone-900">Bonds</strong> first (1:1), then{" "}
        <strong className="text-stone-900">trust units</strong> (group). Tap a row for a bit more
        detail; message opens{" "}
        <span className="font-medium text-stone-800">Private Feed</span>.
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight text-stone-900">Bonds</h2>
        {!hasBonds ? (
          <p className="text-sm text-stone-500">
            No accepted bonds yet. When a bond is accepted, both people appear here with the join
            date.
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

      <section className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight text-stone-900">Trust units</h2>
        {!hasTus ? (
          <p className="text-sm text-stone-500">
            You are not in an active trust unit yet. When one includes you, it shows here with every
            member after you expand the row.
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
    </div>
  );
}
