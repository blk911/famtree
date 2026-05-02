// Preview provider + offers for /studios/apply ("Start your studio") — same page template as live trainer pages.

import type { Provider, StudioOffer } from "@/types/studios";

export const APPLY_PREVIEW_PROVIDER_ID = "apply_preview";

/** Build a Provider-shaped object for the apply / preview experience. */
export function buildApplyPreviewProvider(
  user: { firstName: string; lastName: string; photoUrl: string | null } | null,
  profileBio: string | null,
): Provider {
  const displayName = user ? `${user.firstName} ${user.lastName}` : "Your name";
  const defaultBio =
    "Your profile statement will show here — a short paragraph about who you help and how you work. After you apply, you can edit this copy and publish your studio.";

  return {
    id: APPLY_PREVIEW_PROVIDER_ID,
    displayName,
    slug: "apply",
    category: "trainer",
    serviceType: "Your specialty",
    locationLabel: "Your city · preview",
    city: "Your city",
    state: "",
    imageUrl: user?.photoUrl ?? undefined,
    bio: profileBio?.trim() ? profileBio : defaultBio,
    claimed: false,
    active: true,
    studioId: "apply_preview_studio",
    createdAt: new Date(),
  };
}

/** Sample offers so members see the same card + modal flow before going live. */
export function getApplyPreviewOffers(): StudioOffer[] {
  return [
    {
      id: "apply_preview_offer_1",
      studioId: "apply_preview_studio",
      providerId: APPLY_PREVIEW_PROVIDER_ID,
      title: "Intro session",
      description: "Example offer — clients tap to request. You’ll set real titles, pricing, and duration after approval.",
      priceCents: 7500,
      durationMinutes: 60,
      packageType: "intro",
      active: true,
    },
    {
      id: "apply_preview_offer_2",
      studioId: "apply_preview_studio",
      providerId: APPLY_PREVIEW_PROVIDER_ID,
      title: "Multi-session package",
      description: "Another sample card. Your live studio can list as many services as you need.",
      priceCents: 24000,
      durationMinutes: 60,
      packageType: "three_session",
      active: true,
    },
    {
      id: "apply_preview_offer_3",
      studioId: "apply_preview_studio",
      providerId: APPLY_PREVIEW_PROVIDER_ID,
      title: "Single visit",
      description: "Use this layout for drop-in appointments, recovery blocks, or consults.",
      priceCents: 11000,
      durationMinutes: 45,
      packageType: "single",
      active: true,
    },
  ];
}
