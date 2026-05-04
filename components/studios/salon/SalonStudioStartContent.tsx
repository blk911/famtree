import { TrainerStudioShell } from "@/components/studios/trainer/TrainerStudioShell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { buildSalonTemplateOffers, buildSalonTemplateProvider } from "@/lib/studios/salonStudioTemplate";

/** Salon studio template — live shell duplicate used for “Start your studio” onboarding. */
export async function SalonStudioStartContent() {
  const user = await getCurrentUser();
  const profile = user
    ? await prisma.profile.findUnique({
        where: { userId: user.id },
        select: { bio: true, location: true },
      })
    : null;

  const provider = buildSalonTemplateProvider({
    user: user
      ? { firstName: user.firstName, lastName: user.lastName, photoUrl: user.photoUrl }
      : null,
    profile,
  });
  const offers = buildSalonTemplateOffers();

  return <TrainerStudioShell variant="live" provider={provider} offers={offers} />;
}
