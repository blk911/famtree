// lib/studios/mockStudios.ts
// Static seed data for /studios landing & /admin/studios management shell
// TODO(studios:db): replace with real Prisma queries once schema is added

import type {
  Provider,
  StudioOffer,
  StudioRequest,
  StudioTestimonial,
} from "@/types/studios";

// ─── Sample providers (curated ecosystem demos — invite-first framing; not a directory listing) ─
export const MOCK_PROVIDERS: Provider[] = [
  {
    id: "prov_eco_learning",
    displayName: "Learning & Family Studio",
    slug: "learning-family-studio",
    category: "education_community",
    bio: "A private coordination layer for tutors, guardians, pods, and learning communities — human-led updates without public-feed noise.",
    imageUrl:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=960&q=80",
    claimed: false,
    active: true,
    studioId: "studio_eco_learning",
    createdAt: new Date("2026-03-08"),
  },
  {
    id: "prov_eco_coach",
    displayName: "Private Client Studio",
    slug: "private-client-studio",
    category: "coach_consult_collective",
    bio: "Coaches, trainers, and consultants building trusted client rooms — curated access instead of anonymous marketplace churn.",
    imageUrl:
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=960&q=80",
    claimed: false,
    active: true,
    studioId: "studio_eco_coach",
    createdAt: new Date("2026-03-12"),
  },
  {
    id: "prov_eco_strategy",
    displayName: "Executive & Strategy Space",
    slug: "executive-strategy-space",
    category: "private_business_strategy",
    bio: "Leadership cohorts and founder circles — discreet collaboration with governed invites and stewardship.",
    imageUrl:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=960&q=80",
    claimed: false,
    active: true,
    studioId: "studio_eco_strategy",
    createdAt: new Date("2026-03-20"),
  },
];

// ─── Sample offers ─────────────────────────────────────────────
export const MOCK_OFFERS: StudioOffer[] = [
  {
    id: "offer_eco_learn_001",
    studioId: "studio_eco_learning",
    providerId: "prov_eco_learning",
    title: "Learning pod discovery",
    description: "Invite-only pathway to explore fit for your pod, tutor circle, or family learning Studio.",
    priceCents: null,
    durationMinutes: 45,
    packageType: "intro",
    active: true,
  },
  {
    id: "offer_eco_learn_002",
    studioId: "studio_eco_learning",
    providerId: "prov_eco_learning",
    title: "Guardian & mentor sync",
    description: "Quarterly stewardship touchpoint — aligned updates without public channels.",
    priceCents: null,
    durationMinutes: 30,
    packageType: "single",
    active: true,
  },
  {
    id: "offer_eco_coach_001",
    studioId: "studio_eco_coach",
    providerId: "prov_eco_coach",
    title: "Client studio consult",
    description: "Blueprint your invite-only Studio — onboarding for coaches and boutique practices.",
    priceCents: null,
    durationMinutes: 50,
    packageType: "intro",
    active: true,
  },
  {
    id: "offer_eco_coach_002",
    studioId: "studio_eco_coach",
    providerId: "prov_eco_coach",
    title: "Retention & cadence playbook",
    description: "Private messaging rhythm and offers structure for sustained client relationships.",
    priceCents: null,
    durationMinutes: 60,
    packageType: "three_session",
    active: true,
  },
  {
    id: "offer_eco_strat_001",
    studioId: "studio_eco_strategy",
    providerId: "prov_eco_strategy",
    title: "Strategy circle intake",
    description: "Discreet fit conversation for founders, boards, or leadership cohorts exploring a stewarded Space.",
    priceCents: null,
    durationMinutes: 45,
    packageType: "intro",
    active: true,
  },
  {
    id: "offer_eco_strat_002",
    studioId: "studio_eco_strategy",
    providerId: "prov_eco_strategy",
    title: "Executive roadmap session",
    description: "One deep working session — operating cadence, visibility, and member trust.",
    priceCents: null,
    durationMinutes: 90,
    packageType: "single",
    active: true,
  },
];

// ─── Sample requests ───────────────────────────────────────────
export const MOCK_REQUESTS: StudioRequest[] = [
  {
    id: "req_001",
    studioId: "studio_eco_coach",
    providerId: "prov_eco_coach",
    applicantName: "Jordan M.",
    applicantEmail: "jordan@example.com",
    offerId: "offer_eco_coach_001",
    status: "pending_review",
    createdAt: new Date("2026-05-01T10:23:00"),
  },
  {
    id: "req_002",
    studioId: "studio_eco_learning",
    providerId: "prov_eco_learning",
    applicantName: "Riley P.",
    applicantEmail: "riley@example.com",
    offerId: "offer_eco_learn_001",
    status: "approved_trial",
    createdAt: new Date("2026-04-28T14:11:00"),
    reviewedAt: new Date("2026-04-29T09:00:00"),
  },
  {
    id: "req_003",
    studioId: "studio_eco_strategy",
    providerId: "prov_eco_strategy",
    applicantName: "Sam K.",
    applicantEmail: "sam@example.com",
    offerId: "offer_eco_strat_001",
    status: "member",
    createdAt: new Date("2026-04-22T08:45:00"),
    reviewedAt: new Date("2026-04-23T11:30:00"),
  },
];

// ─── Sample testimonials ───────────────────────────────────────
export const MOCK_TESTIMONIALS: StudioTestimonial[] = [
  {
    id: "test_001",
    quote: "Studios gives us a stewarded Space — invitations, pacing, and real relationships instead of blasting a feed.",
    attribution: "T. Brooks",
    role: "Coach & Consultant",
  },
  {
    id: "test_002",
    quote: "Parents and tutors finally share one calm thread. No more random group chats drowning the important signals.",
    attribution: "M. Lee",
    role: "Learning pod lead",
  },
  {
    id: "test_003",
    quote: "Our leadership circle needed discretion. AIH Studios is the quiet room we didn’t know we could have online.",
    attribution: "A. Diaz",
    role: "Executive cohort facilitator",
  },
];

export function getProviderBySlug(slug: string): Provider | undefined {
  return MOCK_PROVIDERS.find((p) => p.slug === slug && p.active);
}

export function getActiveOffersForProvider(providerId: string): StudioOffer[] {
  return MOCK_OFFERS.filter((o) => o.providerId === providerId && o.active);
}

export function formatOfferPriceUsd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

/** Handles DB-backed tiers with custom / null price without showing $0. */
export function formatStudioOfferPrice(offer: Pick<StudioOffer, "priceCents">): string {
  if (offer.priceCents === undefined || offer.priceCents === null) return "Custom pricing";
  return formatOfferPriceUsd(offer.priceCents);
}

// ─── Aggregate stats helpers (for admin overview) ──────────────
export function getStudiosOverview() {
  return {
    totalStudios: MOCK_PROVIDERS.filter(p => p.studioId).length,
    claimedStudios: MOCK_PROVIDERS.filter(p => p.claimed).length,
    pendingRequests: MOCK_REQUESTS.filter(r => r.status === "pending_review").length,
    activeProviders: MOCK_PROVIDERS.filter(p => p.active).length,
  };
}
