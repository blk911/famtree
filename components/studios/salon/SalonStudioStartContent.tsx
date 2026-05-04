import { TrainerStudioShell } from "@/components/studios/trainer/TrainerStudioShell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import {
  buildSalonApplyHeroFields,
  buildSalonTemplateOffers,
  buildSalonTemplateProvider,
  SALON_APPLY_INTRO_PLACEHOLDER,
} from "@/lib/studios/salonStudioTemplate";

/**
 * Salon “Start your studio” base — matches `/studios/apply` shell (`variant="start"`):
 * ApplyStudioHero inputs, intro row, then profile + services + map columns.
 */
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

  const hero = buildSalonApplyHeroFields(
    user ? { firstName: user.firstName, lastName: user.lastName, email: user.email, photoUrl: user.photoUrl } : null,
    profile ? { location: profile.location } : null,
  );

  return (
    <TrainerStudioShell
      variant="start"
      provider={provider}
      offers={offers}
      applyTemplate={{ hero, intro: SALON_APPLY_INTRO_PLACEHOLDER }}
    />
  );
}
