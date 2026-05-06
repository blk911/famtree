/**
 * Neutral **base** preset — shared spine for personal-services studios before vertical copy lands.
 * Used as the first tab in the admin preset lab and eventually as `/studios/start` default + profile merge target.
 *
 * See `docs/studio-templates.md`.
 */

const TIERS = [
  { id: "tmpl_neutral_t_intro", title: "Intro visit", priceCents: 7500, packageType: "single" as const, durationMinutes: 60 },
  { id: "tmpl_neutral_t_standard", title: "Standard session", priceCents: 12000, packageType: "single" as const, durationMinutes: 90 },
  {
    id: "tmpl_neutral_t_custom",
    title: "Custom",
    priceCents: undefined,
    packageType: "custom" as const,
    durationMinutes: 60,
  },
];

export const NEUTRAL_STUDIO_TEMPLATE = {
  templateId: "neutral-base-v1",
  templateName: "Neutral base (personal services)",
  /** Maps to ProviderCategory `trainer` via normalize — generic professional spine. */
  category: "neutral",
  sourceStudioSlug: "neutral-base",
  version: 1,
  data: {
    providerId: "tmpl_prov_neutral_base_v1",
    studioId: "tmpl_studio_neutral_base_v1",
    slug: "neutral-base-preview",
    name: "Your studio name",
    businessName: "Your studio name",
    tagline: "Private client bookings",
    description:
      "Short welcome — who you serve and how appointments work. Replace this with your story before you publish.",
    email: "you@example.com",
    phone: "",
    address: "",
    heroImageUrl: "",
    serviceType: "Personal services",
    accentHex: "#78716c",
    ownerDisplayName: "Your name",
    introTitle: "Why clients choose you",
    introBullets: [
      "• Clear expectations — timing, pricing, what to bring",
      "• Professional, consistent experience",
      "• Easy booking and follow-up",
    ],
    tiers: TIERS,
    portfolio: [] as { id: string; caption: string; imageUrl: string }[],
    nav: [
      { href: "#about", label: "ABOUT" },
      { href: "#team", label: "TEAM" },
      { href: "#services", label: "SERVICES" },
      { href: "#portfolio", label: "PORTFOLIO" },
      { href: "#book", label: "BOOK" },
      { href: "#contact", label: "CONTACT" },
    ],
  },
} as const;

export type NeutralStudioTemplate = typeof NEUTRAL_STUDIO_TEMPLATE;
