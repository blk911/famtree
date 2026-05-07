import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { TrustUnitCard } from "@/components/tree/TrustUnitCard";
import { BondPeerCard } from "@/components/family-vault/BondPeerCard";
import { loadTrustUnitsSafe, loadBondPeersSafe } from "@/lib/tree/safe-data";

export default async function FamilyUnitsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [trustUnits, bondPeers] = await Promise.all([
    loadTrustUnitsSafe(user.id),
    loadBondPeersSafe(user.id),
  ]);

  const currentMini = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    photoUrl: user.photoUrl,
  };

  const hasTus = trustUnits.length > 0;
  const hasBonds = bondPeers.length > 0;

  return (
    <div className="content-col space-y-10 pb-10">
      <div className="rounded-2xl border border-stone-200 bg-stone-50/80 px-5 py-4 text-sm text-stone-600">
        <strong className="text-stone-800">Family Units</strong> brings together{" "}
        <strong>Trust Units</strong> (private group threads) and{" "}
        <strong>bonds</strong> (accepted 1:1 connections). Use the message button to
        open or start the private conversation in{" "}
        <span className="font-medium text-stone-800">Private Feed</span> — empty
        threads show a composer so you can send the first message.
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-stone-900 tracking-tight">
          Trust Units
        </h2>
        {!hasTus ? (
          <p className="text-sm text-stone-500">
            You are not in an active Trust Unit yet. When a TU is formed with you,
            it will appear here and in Private Feed.
          </p>
        ) : (
          <div className="space-y-3 max-w-2xl">
            {trustUnits.map((unit) => (
              <TrustUnitCard key={unit.id} unit={unit} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-stone-900 tracking-tight">Bonds</h2>
        {!hasBonds ? (
          <p className="text-sm text-stone-500">
            No accepted bonds yet. When someone accepts a connection request, they
            show up here for quick access to your direct thread.
          </p>
        ) : (
          <div className="space-y-3 max-w-2xl">
            {bondPeers.map((peer) => (
              <BondPeerCard
                key={peer.id}
                peer={peer}
                currentUser={currentMini}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
