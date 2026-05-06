/**
 * Fitness / performance studio starter — **saved render** for `/studios/start`.
 *
 * Lineage: shape copied from the Deb Dazzle seed snapshot (`scripts/seedDeb.ts`).
 * Demo literals (business name, email, nail-oriented body copy, tier titles) remain until
 * neutral spine defaults + profile hydration land — see `docs/studio-templates.md`.
 *
 * Read-only at runtime: no DB fetch; does not mutate any live studio row.
 */

/** Tier IDs + pricing mirror seed deb shape; titles still salon-flavored until vertical-specific presets. */
const TIERS = [
  { id: "tmpl_deb_t_clean", title: "Clean Set", priceCents: 5500, packageType: "single" as const, durationMinutes: 60 },
  { id: "tmpl_deb_t_polished", title: "Polished Set", priceCents: 8500, packageType: "single" as const, durationMinutes: 60 },
  { id: "tmpl_deb_t_statement", title: "Statement Set", priceCents: 11500, packageType: "single" as const, durationMinutes: 75 },
  { id: "tmpl_deb_t_full", title: "Full Experience", priceCents: 17500, packageType: "single" as const, durationMinutes: 90 },
  { id: "tmpl_deb_t_style", title: "My Style", priceCents: undefined, packageType: "custom" as const, durationMinutes: 60 },
];

export const FITNESS_STUDIO_TEMPLATE = {
  templateId: "fitness-starter-v1",
  templateName: "Fitness / performance studio starter",
  /** Maps to ProviderCategory `performance_coach` — matches Performance & Longevity spine in shell. */
  category: "performance-coach",
  /** Lineage only — not used for runtime routing. */
  sourceStudioSlug: "deb-dazzle",
  version: 1,
  data: {
    providerId: "tmpl_prov_fitness_starter_v1",
    studioId: "tmpl_studio_fitness_starter_v1",
    slug: "fitness-starter-preview",
    name: "Deb Dazzle",
    businessName: "Deb Dazzle",
    tagline: "My Private Client Network",
    description:
      "Deb Dazzle is a private nail studio focused on sculpting strong shapes, healthy prep, and finishes that last — whether you want everyday polish or statement nails for an event.",
    email: "deb@debdazzles.com",
    phone: "(303) 555-0167",
    address: "9898 Crescent Oaks Dr · Lone Tree, CO",
    heroImageUrl: "",
    serviceType: "Nails · Gel · Sculpted Length · Nail Art",
    accentHex: "#d4897a",
    ownerDisplayName: "Deborah Flook",
    introTitle: "Why train with us",
    introBullets: [
      "• Structured training — no guesswork",
      "• Clear progression - every session",
      "• Strength, conditioning, and recovery",
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
      { href: "#vmb-salons", label: "VMB SALONS" },
    ],
  },
} as const;

export type FitnessStudioTemplate = typeof FITNESS_STUDIO_TEMPLATE;
