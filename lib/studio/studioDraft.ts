import type { OfferPackageType, Provider, ProviderCategory, StudioOffer } from "@/types/studios";
import type { ApplyStudioIntro } from "@/lib/studios/applyPreview";
import type { DebDazzleStudioTemplate } from "@/lib/studio/templates/deb-dazzle-template";

export const STUDIO_PUBLIC_DEFAULT_NAV: { href: string; label: string }[] = [
  { href: "#about", label: "ABOUT" },
  { href: "#team", label: "TEAM" },
  { href: "#portfolio", label: "PORTFOLIO" },
  { href: "#services", label: "SERVICES" },
  { href: "#book", label: "BOOK" },
  { href: "#contact", label: "CONTACT" },
];

/** Mutable builder state — cloned from template or loaded from draft APIs later. */
export type StudioDraftData = {
  identity: {
    creatorName: string;
    studioName: string;
    email: string;
    /** Visible phone exactly as typed — no +1 / E.164 normalization in UI. */
    phoneRaw: string;
    location: string;
    profileImageUrl: string;
  };
  story: {
    headline: string;
    introMediaUrl: string;
    whyBookBullets: string[];
    styleStatement: string;
  };
  offers: Array<{
    id: string;
    title: string;
    priceCents?: number;
    durationMinutes: number;
    packageType: OfferPackageType;
  }>;
  proof: {
    portfolioImages: Array<{ id: string; caption: string; imageUrl: string }>;
    testimonials: Array<{ quote: string; attribution: string; role?: string }>;
    socialLinks: Array<{ label: string; url: string }>;
  };
  launch: {
    slug: string;
    status: "draft" | "published";
    publishedAt: string | null;
    updatedAt: string;
    ownerId: string | null;
    publicUrlHint: string;
    qrOrShareNote: string;
    firstInviteCopy: string;
  };
  meta: {
    category: ProviderCategory;
    accentHex: string;
    tagline: string;
    description: string;
    serviceType: string;
    navItems: { href: string; label: string }[];
  };
};

function mapTemplateCategory(raw: string): ProviderCategory {
  const k = raw.trim().toLowerCase().replace(/-/g, "_");
  if (k === "nail_salon" || k === "nailsalon") return "nail_salon";
  return "beauty_salon";
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** Build initial draft from a **cloned** Deb template envelope (never pass the frozen export directly). */
export function studioDraftFromDebTemplate(cloned: DebDazzleStudioTemplate): StudioDraftData {
  const d = cloned.data;
  const tiers = Array.isArray(d.tiers) ? [...d.tiers] : [];
  const nav = Array.isArray(d.nav) ? [...d.nav] : [];

  return {
    identity: {
      creatorName: safeStr(d.ownerDisplayName),
      studioName: safeStr(d.name),
      email: safeStr(d.email),
      phoneRaw: safeStr(d.phone),
      location: safeStr(d.address),
      profileImageUrl: safeStr(d.heroImageUrl),
    },
    story: {
      headline: safeStr(d.introTitle),
      introMediaUrl: "",
      whyBookBullets: [...(d.introBullets ?? [])].map((b) => safeStr(b)),
      styleStatement: safeStr(d.description),
    },
    offers: tiers.map((t) => ({
      id: safeStr(t.id),
      title: safeStr(t.title),
      priceCents: t.priceCents,
      durationMinutes: typeof t.durationMinutes === "number" ? t.durationMinutes : 60,
      packageType: (t.packageType ?? "single") as OfferPackageType,
    })),
    proof: {
      portfolioImages: [...(Array.isArray(d.portfolio) ? d.portfolio : [])].map((p) => ({
        id: safeStr(p.id),
        caption: safeStr(p.caption),
        imageUrl: safeStr(p.imageUrl),
      })),
      testimonials: [],
      socialLinks: [],
    },
    launch: {
      slug: "",
      status: "draft",
      publishedAt: null,
      updatedAt: new Date().toISOString(),
      ownerId: null,
      publicUrlHint: "",
      qrOrShareNote: "",
      firstInviteCopy: "",
    },
    meta: {
      category: mapTemplateCategory(cloned.category),
      accentHex: safeStr(d.accentHex) || "#d4897a",
      tagline: safeStr(d.tagline),
      description: safeStr(d.description),
      serviceType: safeStr(d.serviceType),
      navItems:
        nav.length > 0
          ? nav.map((n) => ({ href: safeStr(n.href), label: safeStr(n.label) }))
          : [
              { href: "#about", label: "ABOUT" },
              { href: "#team", label: "TEAM" },
              { href: "#portfolio", label: "PORTFOLIO" },
              { href: "#services", label: "SERVICES" },
              { href: "#book", label: "BOOK" },
              { href: "#contact", label: "CONTACT" },
            ],
    },
  };
}

function templateOffersFromDraftOffers(
  studioId: string,
  providerId: string,
  rows: StudioDraftData["offers"],
): StudioOffer[] {
  return rows.map((t) => {
    const priceLabel =
      t.priceCents != null
        ? (t.priceCents / 100).toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          })
        : null;
    return {
      id: t.id,
      studioId,
      providerId,
      title: t.title,
      description: priceLabel
        ? `${t.title} — ${priceLabel}`
        : `${t.title} — custom pricing; reach out to book.`,
      priceCents: t.priceCents,
      durationMinutes: t.durationMinutes,
      packageType: t.packageType,
      active: true,
    };
  });
}

/** Maps draft → live shell props (read-only render — does not persist). */
export function draftToPublicPayload(draft: StudioDraftData): {
  provider: Provider;
  offers: StudioOffer[];
  storyIntro: ApplyStudioIntro;
  accentHex: string;
  navItems: { href: string; label: string }[];
} {
  const slug =
    draft.launch.slug.trim() ||
    draft.identity.studioName.trim().toLowerCase().replace(/\s+/g, "-") ||
    "studio-preview";
  const studioId = `draft_studio_${slug.replace(/[^a-z0-9-]/gi, "_").slice(0, 48)}`;
  const providerId = `draft_prov_${slug.replace(/[^a-z0-9-]/gi, "_").slice(0, 48)}`;

  const bullets =
    draft.story.whyBookBullets.length > 0
      ? draft.story.whyBookBullets
      : draft.meta.description
        ? [draft.meta.description]
        : [];

  const provider: Provider = {
    id: providerId,
    displayName: draft.identity.studioName || "Your Studio",
    slug,
    category: draft.meta.category,
    serviceType: draft.meta.serviceType || undefined,
    locationLabel: draft.identity.location || undefined,
    city: undefined,
    state: undefined,
    imageUrl: draft.identity.profileImageUrl || undefined,
    introVideoUrl: draft.story.introMediaUrl || undefined,
    bio: draft.story.styleStatement || draft.meta.description || draft.meta.tagline,
    claimed: draft.launch.status === "published",
    active: true,
    studioId,
    createdAt: new Date(),
  };

  const offers =
    draft.offers.length > 0
      ? templateOffersFromDraftOffers(studioId, providerId, draft.offers)
      : [];

  const storyIntro: ApplyStudioIntro = {
    title: draft.story.headline || "Why book with us",
    bullets,
  };

  return {
    provider,
    offers,
    storyIntro,
    accentHex: draft.meta.accentHex,
    navItems: draft.meta.navItems.length > 0 ? draft.meta.navItems : STUDIO_PUBLIC_DEFAULT_NAV,
  };
}

/** Minimal story block for DB-backed studios (tagline/bio only until CMS fields exist). */
export function liveStoryFromProvider(provider: Provider): ApplyStudioIntro {
  const bio = provider.bio?.trim();
  return {
    title: "Why book with us",
    bullets: bio ? [bio] : ["Add your studio story in the builder."],
  };
}
