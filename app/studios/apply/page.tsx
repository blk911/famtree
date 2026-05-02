import type { Metadata } from "next";
import { TrainerStudioShell } from "@/components/studios/trainer/TrainerStudioShell";
import { StudiosFooter } from "@/components/studios/StudiosFooter";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { buildApplyPreviewProvider, getApplyPreviewOffers } from "@/lib/studios/applyPreview";

export const metadata: Metadata = {
  title: "Start your studio — AIH Studios",
  description:
    "Preview your AIH Studios page — profile, services, and how clients request sessions. Apply when you’re ready to publish.",
};

export default async function StartYourStudioPage() {
  const user = await getCurrentUser();
  const profile = user
    ? await prisma.profile.findUnique({
        where: { userId: user.id },
        select: { bio: true },
      })
    : null;

  const provider = buildApplyPreviewProvider(
    user ? { firstName: user.firstName, lastName: user.lastName, photoUrl: user.photoUrl } : null,
    profile?.bio ?? null,
  );
  const offers = getApplyPreviewOffers();

  return (
    <>
      <TrainerStudioShell provider={provider} offers={offers} variant="start" />
      <StudiosFooter />
    </>
  );
}
