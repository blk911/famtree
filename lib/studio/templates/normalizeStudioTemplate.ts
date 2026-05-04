import type { ApplyStudioHeroFields, ApplyStudioIntro } from "@/lib/studios/applyPreview";
import { sanitizeApplyStudioHeroFields } from "@/lib/studios/applyPreview";
import type { OfferPackageType, Provider, ProviderCategory, StudioOffer } from "@/types/studios";
import type { DebDazzleStudioTemplate } from "@/lib/studio/templates/deb-dazzle-template";

/** Props consumed by `StudioEditor` / `TrainerStudioShell` start variant — all concrete values. */
export type NormalizedStudioEditorProps = {
  provider: Provider;
  offers: StudioOffer[];
  hero: ApplyStudioHeroFields;
  intro: ApplyStudioIntro;
  navItems: readonly { href: string; label: string }[];
  /** Preview navigates to `/studios/{slug}` — disabled for canonical template (never targets live Deb). */
  editorPreviewSlug: string | null;
  accentHex: string;
  /** Isolated localStorage scope so drafts never collide with `/studios/apply`. */
  draftStorageKey: string;
};

function mapTemplateCategory(raw: string): ProviderCategory {
  const k = raw.trim().toLowerCase().replace(/-/g, "_");
  if (k === "nail_salon" || k === "nailsalon") return "nail_salon";
  return "beauty_salon";
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** Builds Deb-shaped offers from template tiers — IDs are template-only. */
function templateOffersFromTiers(
  studioId: string,
  providerId: string,
  tiers: readonly {
    readonly id: string;
    readonly title: string;
    readonly priceCents?: number;
    readonly packageType: OfferPackageType;
    readonly durationMinutes: number;
  }[],
): StudioOffer[] {
  return tiers.map((t) => {
    const priceLabel =
      t.priceCents != null
        ? (t.priceCents / 100).toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          })
        : null;
    return {
      id: safeStr(t.id),
      studioId: safeStr(studioId),
      providerId: safeStr(providerId),
      title: safeStr(t.title),
      description: priceLabel
        ? `${safeStr(t.title)} — ${priceLabel}`
        : `${safeStr(t.title)} — custom pricing; reach out to book.`,
      priceCents: t.priceCents,
      durationMinutes: typeof t.durationMinutes === "number" ? t.durationMinutes : 60,
      packageType: t.packageType,
      active: true,
    };
  });
}

/**
 * Turns the canonical template envelope into editor-ready props.
 * No DB reads — pure projection + string/array guards.
 */
export function normalizeStudioTemplate(envelope: DebDazzleStudioTemplate): NormalizedStudioEditorProps {
  const d = envelope.data;
  const category = mapTemplateCategory(envelope.category);

  const studioId = safeStr(d.studioId) || "tmpl_studio_deb_dazzle_v1";
  const providerId = safeStr(d.providerId) || "tmpl_prov_deb_dazzle_v1";
  const slug = safeStr(d.slug) || "deb-dazzle-template-preview";

  const heroRaw: ApplyStudioHeroFields = {
    fullName: safeStr(d.ownerDisplayName),
    businessName: safeStr(d.businessName) || safeStr(d.name),
    email: safeStr(d.email),
    phone: safeStr(d.phone),
    physicalAddress: safeStr(d.address),
  };

  const provider: Provider = {
    id: providerId,
    displayName: safeStr(d.name) || "Your Studio",
    slug,
    category,
    serviceType: safeStr(d.serviceType) || undefined,
    locationLabel: safeStr(d.address) || undefined,
    city: undefined,
    state: undefined,
    imageUrl: safeStr(d.heroImageUrl) || undefined,
    introVideoUrl: undefined,
    bio: safeStr(d.description) || safeStr(d.tagline),
    claimed: false,
    active: true,
    studioId,
    createdAt: new Date(),
  };

  const tiersList = [...d.tiers];

  const offers = templateOffersFromTiers(
    studioId,
    providerId,
    tiersList.map((t) => ({
      id: safeStr(t.id),
      title: safeStr(t.title),
      priceCents: t.priceCents,
      packageType: (t.packageType ?? "single") as OfferPackageType,
      durationMinutes: typeof t.durationMinutes === "number" ? t.durationMinutes : 60,
    })),
  );

  const introBullets = [...d.introBullets].map((b) => safeStr(b)).filter(Boolean);
  const intro: ApplyStudioIntro = {
    title: safeStr(d.introTitle) || "Why book with us",
    bullets:
      introBullets.length > 0
        ? introBullets
        : ["Placeholder bullet — replace with your studio story."],
  };

  const navRaw = Array.isArray(d.nav) ? [...d.nav] : [];
  const navItems: { href: string; label: string }[] =
    navRaw.length > 0
      ? navRaw.map((n) => ({ href: safeStr(n.href), label: safeStr(n.label) }))
      : [
          { href: "#about", label: "ABOUT" },
          { href: "#team", label: "TEAM" },
          { href: "#services", label: "SERVICES" },
          { href: "#portfolio", label: "PORTFOLIO" },
          { href: "#book", label: "BOOK" },
          { href: "#contact", label: "CONTACT" },
          { href: "#vmb-salons", label: "VMB SALONS" },
        ];

  const accentHex = safeStr(d.accentHex) || "#d4897a";

  return {
    provider,
    offers,
    hero: sanitizeApplyStudioHeroFields(heroRaw),
    intro,
    navItems,
    editorPreviewSlug: null,
    accentHex,
    draftStorageKey: "amih_studios_deb_template_draft_v1",
  };
}
