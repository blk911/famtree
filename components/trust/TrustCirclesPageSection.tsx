import { TrustUnitCard } from "@/components/tree/TrustUnitCard";
import { DraftTrustCirclesBanner, TrustCirclesEmptyBanner } from "./DraftTrustCirclesBanner";
import type { TrustUnitLike } from "@/lib/trust/display";
import { partitionTrustUnits } from "@/lib/trust/display";

type TreeTrustUnit = {
  id: string;
  members: Array<{
    user: { id: string; firstName: string; lastName: string; photoUrl: string | null };
  }>;
};

export function TrustCirclesPageSection({
  trustUnits,
  currentUserId,
  heading = "Trust Circles",
}: {
  trustUnits: TreeTrustUnit[];
  currentUserId: string;
  heading?: string;
}) {
  const { active, draftCount } = partitionTrustUnits(
    trustUnits as TrustUnitLike[],
    currentUserId,
  );

  const showSection =
    active.length > 0 || draftCount > 0 || trustUnits.length === 0;

  if (!showSection) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{heading}</h2>
      {active.length > 0 &&
        active.map((unit) => (
          <TrustUnitCard key={unit.id} unit={unit as TreeTrustUnit} />
        ))}
      {draftCount > 0 && <DraftTrustCirclesBanner draftCount={draftCount} />}
      {active.length === 0 && draftCount === 0 && <TrustCirclesEmptyBanner />}
    </div>
  );
}
