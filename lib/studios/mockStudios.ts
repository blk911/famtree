// lib/studios/mockStudios.ts
// Static seed data for /studios landing & /admin/studios management shell
// TODO(studios:db): replace with real Prisma queries once schema is added

import type {
  Provider,
  StudioOffer,
  StudioRequest,
  StudioTestimonial,
} from "@/types/studios";

// ─── Sample providers ──────────────────────────────────────────
export const MOCK_PROVIDERS: Provider[] = [
  {
    id: "prov_001",
    displayName: "Apex Performance",
    slug: "apex-performance",
    category: "trainer",
    serviceType: "1:1 Strength Training",
    locationLabel: "Lone Tree, CO",
    city: "Lone Tree",
    state: "CO",
    imageUrl: "/studios/placeholders/provider-1.jpg",
    introVideoUrl: undefined,
    bio: "High-performance strength and conditioning for athletes and weekend warriors.",
    claimed: true,
    active: true,
    studioId: "studio_001",
    createdAt: new Date("2026-04-01"),
  },
  {
    id: "prov_002",
    displayName: "Reset Recovery",
    slug: "reset-recovery",
    category: "recovery",
    serviceType: "Sauna · Cryo · Compression",
    locationLabel: "Park Meadows, CO",
    city: "Lone Tree",
    state: "CO",
    imageUrl: "/studios/placeholders/provider-2.jpg",
    bio: "Modern recovery methods for high performers.",
    claimed: true,
    active: true,
    studioId: "studio_002",
    createdAt: new Date("2026-04-08"),
  },
  {
    id: "prov_003",
    displayName: "MoveWell PT",
    slug: "movewell-pt",
    category: "physical_therapy",
    serviceType: "Movement-based Physical Therapy",
    locationLabel: "Denver, CO",
    city: "Denver",
    state: "CO",
    imageUrl: "/studios/placeholders/provider-3.jpg",
    bio: "PT-led movement screens and rehab plans.",
    claimed: false,
    active: true,
    createdAt: new Date("2026-04-15"),
  },
  {
    id: "prov_004",
    displayName: "Refuel Hydration",
    slug: "refuel-hydration",
    category: "hydration_iv",
    serviceType: "IV Hydration & Vitamin Drips",
    locationLabel: "Denver, CO",
    city: "Denver",
    state: "CO",
    imageUrl: "/studios/placeholders/provider-4.jpg",
    bio: "Mobile and in-studio IV hydration.",
    claimed: false,
    active: true,
    createdAt: new Date("2026-04-20"),
  },
];

// ─── Sample offers ─────────────────────────────────────────────
export const MOCK_OFFERS: StudioOffer[] = [
  {
    id: "offer_001",
    studioId: "studio_001",
    providerId: "prov_001",
    title: "Intro Strength Session",
    description: "60 minute movement assessment + first workout.",
    priceCents: 7500,
    durationMinutes: 60,
    packageType: "intro",
    active: true,
  },
  {
    id: "offer_002",
    studioId: "studio_001",
    providerId: "prov_001",
    title: "3-Session Starter",
    description: "Three private training sessions to build a baseline.",
    priceCents: 27000,
    durationMinutes: 60,
    packageType: "three_session",
    active: true,
  },
  {
    id: "offer_003",
    studioId: "studio_002",
    providerId: "prov_002",
    title: "Recovery Reset",
    description: "Sauna + cryo + compression in one visit.",
    priceCents: 12500,
    durationMinutes: 90,
    packageType: "single",
    active: true,
  },
];

// ─── Sample requests ───────────────────────────────────────────
export const MOCK_REQUESTS: StudioRequest[] = [
  {
    id: "req_001",
    studioId: "studio_001",
    providerId: "prov_001",
    applicantName: "Jordan M.",
    applicantEmail: "jordan@example.com",
    offerId: "offer_001",
    status: "pending_review",
    createdAt: new Date("2026-05-01T10:23:00"),
  },
  {
    id: "req_002",
    studioId: "studio_001",
    providerId: "prov_001",
    applicantName: "Riley P.",
    applicantEmail: "riley@example.com",
    offerId: "offer_002",
    status: "approved_trial",
    createdAt: new Date("2026-04-28T14:11:00"),
    reviewedAt: new Date("2026-04-29T09:00:00"),
  },
  {
    id: "req_003",
    studioId: "studio_002",
    providerId: "prov_002",
    applicantName: "Sam K.",
    applicantEmail: "sam@example.com",
    offerId: "offer_003",
    status: "member",
    createdAt: new Date("2026-04-22T08:45:00"),
    reviewedAt: new Date("2026-04-23T11:30:00"),
  },
];

// ─── Sample testimonials ───────────────────────────────────────
export const MOCK_TESTIMONIALS: StudioTestimonial[] = [
  {
    id: "test_001",
    quote: "Studios let me focus on training. Clients show up ready and the right people find me through referrals.",
    attribution: "T. Brooks",
    role: "Strength Coach, Apex",
  },
  {
    id: "test_002",
    quote: "I used to bounce between booking apps. Now my clients live in one place and I see exactly where they are.",
    attribution: "M. Lee",
    role: "PT, Movement Specialist",
  },
  {
    id: "test_003",
    quote: "Being part of a curated network changed who walks through my door. Higher trust, better outcomes.",
    attribution: "A. Diaz",
    role: "Recovery Provider",
  },
];

// ─── Aggregate stats helpers (for admin overview) ──────────────
export function getStudiosOverview() {
  return {
    totalStudios: MOCK_PROVIDERS.filter(p => p.studioId).length,
    claimedStudios: MOCK_PROVIDERS.filter(p => p.claimed).length,
    pendingRequests: MOCK_REQUESTS.filter(r => r.status === "pending_review").length,
    activeProviders: MOCK_PROVIDERS.filter(p => p.active).length,
  };
}
