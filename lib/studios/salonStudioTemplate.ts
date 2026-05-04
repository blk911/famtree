// Salon studio template — same TrainerStudioShell variant "start" as /studios/apply
// (hero form + intro video row + services/map columns). Deb-parity tiers; beauty_salon category.

import type { ApplyStudioHeroFields, ApplyStudioIntro } from "@/lib/studios/applyPreview";
import { buildApplyHeroFields } from "@/lib/studios/applyPreview";
import type { OfferPackageType, Provider, StudioOffer } from "@/types/studios";

export const SALON_TEMPLATE_STUDIO_NAME_PLACEHOLDER = "[NAME]";

export const SALON_APPLY_INTRO_PLACEHOLDER: ApplyStudioIntro = {
  title: "Why book with us",
  bullets: [
    "Placeholder — what makes your chair or suite different (cuts, color, extensions).",
    "Placeholder — how visits flow (consultation, timing, add-ons, checkout).",
    "Placeholder — who you love serving (events, maintenance color, first-time guests).",
    "Placeholder — studio location, parking, hours, or mobile options.",
  ],
};

export function buildSalonApplyHeroFields(
  user: { firstName: string; lastName: string; email: string; photoUrl: string | null } | null,
  profile: { location: string | null } | null,
): ApplyStudioHeroFields {
  const base = buildApplyHeroFields(user, profile);
  return {
    ...base,
    businessName: SALON_TEMPLATE_STUDIO_NAME_PLACEHOLDER,
  };
}

const STUDIO_ID = "studio_salon_template";
const PROVIDER_ID = "salon_template_preview";

/** Same tier concepts as Deb Dazzle seed — salon framing; prices are template defaults. */
const SALON_TEMPLATE_TIERS: { key: string; title: string; priceCents: number | undefined; packageType: OfferPackageType }[] = [
  { key: "salon_t_clean", title: "Clean Set", priceCents: 5500, packageType: "single" },
  { key: "salon_t_polished", title: "Polished Set", priceCents: 8500, packageType: "single" },
  { key: "salon_t_statement", title: "Statement Set", priceCents: 11500, packageType: "single" },
  { key: "salon_t_full", title: "Full Experience", priceCents: 17500, packageType: "single" },
  { key: "salon_t_style", title: "My Style", priceCents: undefined, packageType: "custom" },
];

export function buildSalonTemplateProvider(opts: {
  user: { firstName: string; lastName: string; photoUrl: string | null } | null;
  profile: { bio: string | null; location: string | null } | null;
}): Provider {
  const { user, profile } = opts;

  const bio =
    profile?.bio?.trim() ||
    (user
      ? "Your salon story will appear here — we started from your AMIHUMAN profile. You’ll refine this before publishing."
      : "Tell clients what makes your chair unique. Sign in to pull your AMIHUMAN profile as a starting point.");

  const locationLabel = profile?.location?.trim() || undefined;

  return {
    id: PROVIDER_ID,
    displayName: SALON_TEMPLATE_STUDIO_NAME_PLACEHOLDER,
    slug: "salon-template",
    category: "beauty_salon",
    serviceType: "Hair · Color · Styling",
    locationLabel,
    city: undefined,
    state: undefined,
    imageUrl: user?.photoUrl ?? undefined,
    introVideoUrl: undefined,
    bio,
    claimed: false,
    active: true,
    studioId: STUDIO_ID,
    createdAt: new Date(),
  };
}

export function buildSalonTemplateOffers(): StudioOffer[] {
  return SALON_TEMPLATE_TIERS.map((t) => {
    const priceLabel =
      t.priceCents != null
        ? (t.priceCents / 100).toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          })
        : null;

    return {
      id: t.key,
      studioId: STUDIO_ID,
      providerId: PROVIDER_ID,
      title: t.title,
      description: priceLabel
        ? `${t.title} — ${priceLabel}`
        : `${t.title} — custom pricing; reach out to book.`,
      priceCents: t.priceCents,
      durationMinutes: 60,
      packageType: t.packageType,
      active: true,
    };
  });
}
