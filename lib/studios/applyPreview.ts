// Preview provider + offers for /studios/apply ("Start your studio") — same page template as live trainer pages.

import type { Provider, StudioOffer } from "@/types/studios";

export const APPLY_PREVIEW_PROVIDER_ID = "apply_preview";

export type ApplyStudioHeroFields = {
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  physicalAddress: string;
};

export type ApplyStudioIntro = {
  title: string;
  bullets: readonly string[];
};

export const APPLY_INTRO_PLACEHOLDER: ApplyStudioIntro = {
  title: "Why train with us",
  bullets: [
    "Placeholder — what makes your coaching or care different.",
    "Placeholder — how sessions flow (assessment, progression, check-ins).",
    "Placeholder — who you help best (sport, season of life, goals).",
    "Placeholder — where you train (studio address, mobile, hybrid).",
  ],
};

/** Prefill from AMIHUMAN.NET account / profile where available; otherwise empty (placeholder hints in the UI). */
export function buildApplyHeroFields(
  user: { firstName: string; lastName: string; email: string; photoUrl: string | null; phone?: string | null } | null,
  profile: { location: string | null; phone?: string | null } | null,
): ApplyStudioHeroFields {
  /** Prefer profile phone; optional account `user.phone` when present — raw display, no +1 normalization */
  const displayPhone = profile?.phone ?? user?.phone ?? "";
  return {
    fullName: user ? `${user.firstName} ${user.lastName}`.trim() : "",
    businessName: "",
    email: user?.email?.trim() ?? "",
    phone: displayPhone,
    physicalAddress: profile?.location?.trim() ?? "",
  };
}

/** Build a Provider-shaped object for the apply / preview experience (offers + modals still use displayName). */
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
