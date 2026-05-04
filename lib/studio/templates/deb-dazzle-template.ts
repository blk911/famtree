/**
 * Canonical “golden” studio starter — copied from the Deb Dazzle seed shape (scripts/seedDeb.ts).
 * Read-only snapshot: never fetched from DB at runtime and never mutates the live deb-dazzle instance.
 */

/** Matches scripts/seedDeb.ts service tiers (USD retail); IDs are synthetic template IDs only. */
const TIERS = [
  { id: "tmpl_deb_t_clean", title: "Clean Set", priceCents: 5500, packageType: "single" as const, durationMinutes: 60 },
  { id: "tmpl_deb_t_polished", title: "Polished Set", priceCents: 8500, packageType: "single" as const, durationMinutes: 60 },
  { id: "tmpl_deb_t_statement", title: "Statement Set", priceCents: 11500, packageType: "single" as const, durationMinutes: 75 },
  { id: "tmpl_deb_t_full", title: "Full Experience", priceCents: 17500, packageType: "single" as const, durationMinutes: 90 },
  { id: "tmpl_deb_t_style", title: "My Style", priceCents: undefined, packageType: "custom" as const, durationMinutes: 60 },
];

export const DEB_DAZZLE_STUDIO_TEMPLATE = {
  templateId: "deb-dazzle-template",
  templateName: "Deb Dazzle Nail Studio Template",
  /** Editorial label; normalized to ProviderCategory `nail_salon`. */
  category: "nail-salon",
  /** Documents lineage only — no runtime fetch by this slug. */
  sourceStudioSlug: "deb-dazzle",
  version: 1,
  data: {
    providerId: "tmpl_prov_deb_dazzle_v1",
    studioId: "tmpl_studio_deb_dazzle_v1",
    /** Preview slug only — not the live `deb-dazzle` route / DB row. */
    slug: "deb-dazzle-template-preview",
    name: "Deb Dazzle",
    businessName: "Deb Dazzle",
    tagline: "My Private Client Network",
    description:
      "Deb Dazzle is a private nail studio focused on sculpting strong shapes, healthy prep, and finishes that last — whether you want everyday polish or statement nails for an event.",
    /** Demo inbox from seed persona — template-only copy. */
    email: "deb@debdazzles.com",
    /** Raw display — no +1 / E.164 normalization in UI. */
    phone: "(303) 555-0167",
    address: "9898 Crescent Oaks Dr · Lone Tree, CO",
    heroImageUrl: "",
    serviceType: "Nails · Gel · Sculpted Length · Nail Art",
    accentHex: "#d4897a",
    ownerDisplayName: "Deborah Flook",
    introTitle: "Why book with Deb Dazzle",
    introBullets: [
      "Detailed shaping and structured gel applications tailored to your nail plate — not one-size prep.",
      "Clear timing for fills, repairs, and art add-ons so appointments stay predictable.",
      "Clients who want length + strength without compromising nail health.",
      "Hosted in Lone Tree with parking notes sent before your first visit.",
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

export type DebDazzleStudioTemplate = typeof DEB_DAZZLE_STUDIO_TEMPLATE;
