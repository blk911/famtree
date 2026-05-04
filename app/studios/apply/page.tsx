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

const ROUTE = "[studios/apply]";

export default async function StartYourStudioPage() {
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let editorPreviewSlug: string | null = null;
  try {
    user = await getCurrentUser();
    editorPreviewSlug = getEditorPreviewSlug(user);
    console.log(`${ROUTE} user loaded`, {
      hasUser: Boolean(user),
      role: user?.role,
      tenantId: user?.tenantId ?? null,
      studioSlug: editorPreviewSlug,
      editorPreviewSlug,
      hasEmail: Boolean(user?.email),
    });
  } catch (error) {
    console.error(`${ROUTE} failed loading user`, error);
    throw error;
  }

  let profile: { bio: string | null; location: string | null; phone: string | null } | null = null;
  if (user) {
    try {
      profile = await prisma.profile.findUnique({
        where: { userId: user.id },
        select: { bio: true, location: true, phone: true },
      });
      console.log(`${ROUTE} profile loaded`, {
        hasProfile: Boolean(profile),
        hasBio: Boolean(profile?.bio?.trim()),
        hasLocation: Boolean(profile?.location?.trim()),
        hasPhone: Boolean(profile?.phone),
      });
    } catch (error) {
      console.error(`${ROUTE} failed loading profile`, error);
      throw error;
    }
  }

  let provider: ReturnType<typeof buildApplyPreviewProvider>;
  let offers: ReturnType<typeof getApplyPreviewOffers>;
  let hero: ReturnType<typeof buildApplyHeroFields>;
  try {
    provider = buildApplyPreviewProvider(
      user ? { firstName: user.firstName, lastName: user.lastName, photoUrl: user.photoUrl } : null,
      profile?.bio ?? null,
    );
    offers = getApplyPreviewOffers();
    hero = buildApplyHeroFields(
      user ? { firstName: user.firstName, lastName: user.lastName, email: user.email, photoUrl: user.photoUrl } : null,
      profile ? { location: profile.location, phone: profile.phone } : null,
    );
    console.log(`${ROUTE} preview built`, { providerSlug: provider.slug, offersCount: offers.length });
  } catch (error) {
    console.error(`${ROUTE} failed building apply preview`, error);
    throw error;
  }

  return (
    <>
      <TrainerStudioShell
        provider={provider}
        offers={offers}
        variant="start"
        applyTemplate={{ hero, intro: APPLY_INTRO_PLACEHOLDER }}
        editorPreviewSlug={editorPreviewSlug}
      />
      <StudiosFooter />
    </>
  );
}
