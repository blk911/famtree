import type { Metadata } from "next";
import { TrainerStudioShell } from "@/components/studios/trainer/TrainerStudioShell";
import { StudiosFooter } from "@/components/studios/StudiosFooter";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { APPLY_INTRO_PLACEHOLDER, buildApplyHeroFields, buildApplyPreviewProvider, getApplyPreviewOffers } from "@/lib/studios/applyPreview";
import { getEditorPreviewSlug } from "@/lib/studios/editorPreviewSlug";

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
        select: { bio: true, location: true, phone: true },
      })
    : null;

  const provider = buildApplyPreviewProvider(
    user ? { firstName: user.firstName, lastName: user.lastName, photoUrl: user.photoUrl } : null,
    profile?.bio ?? null,
  );
  const offers = getApplyPreviewOffers();

  const hero = buildApplyHeroFields(
    user ? { firstName: user.firstName, lastName: user.lastName, email: user.email, photoUrl: user.photoUrl } : null,
    profile ? { location: profile.location, phone: profile.phone } : null,
  );

  return (
    <>
      <TrainerStudioShell
        provider={provider}
        offers={offers}
        variant="start"
        applyTemplate={{ hero, intro: APPLY_INTRO_PLACEHOLDER }}
        editorPreviewSlug={getEditorPreviewSlug(user)}
      />
      <StudiosFooter />
    </>
  );
}
