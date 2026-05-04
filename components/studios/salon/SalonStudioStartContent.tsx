import { TrainerStudioShell } from "@/components/studios/trainer/TrainerStudioShell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getEditorPreviewSlug } from "@/lib/studios/editorPreviewSlug";
import {
  EMPTY_APPLY_STUDIO_HERO_FIELDS,
} from "@/lib/studios/applyPreview";
import {
  buildSalonApplyHeroFields,
  buildSalonTemplateOffers,
  buildSalonTemplateProvider,
  SALON_APPLY_INTRO_PLACEHOLDER,
} from "@/lib/studios/salonStudioTemplate";

const ROUTE = "[studios/start]";

/**
 * Salon “Start your studio” base — matches `/studios/apply` shell (`variant="start"`):
 * ApplyStudioHero inputs, intro row, then profile + services + map columns.
 */
export async function SalonStudioStartContent() {
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
      console.error(`${ROUTE} profile fetch failed; continuing without profile`, error);
      profile = null;
    }
  }

  let provider: ReturnType<typeof buildSalonTemplateProvider>;
  let offers: ReturnType<typeof buildSalonTemplateOffers>;
  let hero: ReturnType<typeof buildSalonApplyHeroFields>;
  try {
    provider = buildSalonTemplateProvider({
      user: user
        ? { firstName: user.firstName, lastName: user.lastName, photoUrl: user.photoUrl }
        : null,
      profile,
    });
    offers = buildSalonTemplateOffers();
    hero = buildSalonApplyHeroFields(
      user
        ? {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            photoUrl: user.photoUrl,
          }
        : null,
      profile ? { location: profile.location, phone: profile.phone } : null,
    );
    console.log(`${ROUTE} template built`, {
      providerSlug: provider.slug,
      offersCount: offers.length,
    });
  } catch (error) {
    console.error(`${ROUTE} failed building salon template — using empty draft hero`, error);
    provider = buildSalonTemplateProvider({ user: null, profile: null });
    offers = buildSalonTemplateOffers();
    hero = EMPTY_APPLY_STUDIO_HERO_FIELDS;
  }

  return (
    <TrainerStudioShell
      variant="start"
      provider={provider}
      offers={offers}
      applyTemplate={{ hero, intro: SALON_APPLY_INTRO_PLACEHOLDER }}
      editorPreviewSlug={editorPreviewSlug}
    />
  );
}
