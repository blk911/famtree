import type {
  Campaign,
  RevenueOpportunity,
  TrustedCircle,
  VmbClient,
} from "@/types/vmb";

export const DEMO_SALON_NAME = "Beauty Tribe Salon";

export const DEMO_DASHBOARD_HERO = {
  salonName: DEMO_SALON_NAME,
  potentialRevenue: 6840,
  subtitle: "Potential Revenue Found",
};

export const DEMO_DASHBOARD_CARDS = [
  { id: "reactivation", label: "Reactivation", value: 17, amount: 2040, unit: "targets" },
  { id: "referral", label: "Referral", value: 11, amount: 1980, unit: "opportunities" },
  { id: "gift", label: "Gift", value: 8, amount: 1120, unit: "moments" },
  { id: "trusted", label: "Trusted Providers", value: 4, amount: 900, unit: "connections" },
  { id: "revenue", label: "Revenue", value: null, amount: 6840, unit: "recoverable" },
] as const;

export const DEMO_START_ANALYSIS = {
  reactivationTargets: 17,
  referralOpportunities: 11,
  giftOpportunities: 8,
  estimatedRecoverableRevenue: 2840,
};

export const DEMO_CLIENTS: VmbClient[] = [
  {
    id: "client-amy",
    name: "Amy Johnson",
    primaryService: "hair",
    primaryServiceLabel: "Hair",
    status: "active",
    lastVisit: "Mar 12, 2026",
    trustedProviders: [
      { category: "Nails", status: "empty" },
      { category: "Skin", status: "empty" },
      { category: "Wax", status: "empty" },
      { category: "Massage", providerName: "Lauren", status: "connected" },
    ],
  },
  {
    id: "client-maya",
    name: "Maya Chen",
    primaryService: "hair",
    primaryServiceLabel: "Hair",
    status: "vip",
    lastVisit: "Apr 2, 2026",
    trustedProviders: [
      { category: "Nails", providerName: "Jenny", status: "connected" },
      { category: "Skin", providerName: "Sarah", status: "connected" },
      { category: "Wax", status: "empty" },
      { category: "Massage", status: "empty" },
    ],
  },
  {
    id: "client-taylor",
    name: "Taylor Brooks",
    primaryService: "hair",
    primaryServiceLabel: "Hair",
    status: "lapsed",
    lastVisit: "Nov 8, 2025",
    trustedProviders: [
      { category: "Nails", status: "empty" },
      { category: "Skin", status: "empty" },
      { category: "Wax", status: "empty" },
      { category: "Massage", status: "empty" },
    ],
  },
  {
    id: "client-jordan",
    name: "Jordan Lee",
    primaryService: "hair",
    primaryServiceLabel: "Hair",
    status: "active",
    lastVisit: "Apr 18, 2026",
    trustedProviders: [
      { category: "Nails", providerName: "Jenny", status: "connected" },
      { category: "Skin", status: "empty" },
      { category: "Wax", status: "empty" },
      { category: "Massage", status: "empty" },
    ],
  },
];

export const DEMO_TRUSTED_CIRCLE: TrustedCircle = {
  salonId: "salon-beauty-tribe",
  salonName: DEMO_SALON_NAME,
  clientCount: 312,
  expansionSlots: 2,
  providers: [
    { id: "tp-jenny", name: "Jenny", category: "Nails", specialty: "Gel & nail art", status: "active" },
    { id: "tp-sarah", name: "Sarah", category: "Skin", specialty: "Facials & peels", status: "active" },
    { id: "tp-lauren", name: "Lauren", category: "Massage", specialty: "Therapeutic massage", status: "active" },
    { id: "tp-pending", name: "Rachel", category: "Wax", specialty: "Brow & body", status: "pending" },
  ],
};

export const DEMO_OPPORTUNITIES: RevenueOpportunity[] = [
  {
    id: "opp-reactivation",
    type: "reactivation",
    title: "Reactivation Revenue",
    description: "Clients who haven't booked in 90+ days but still trust your salon.",
    count: 17,
    estimatedValue: 2040,
  },
  {
    id: "opp-referral",
    type: "referral",
    title: "Referral Revenue",
    description: "Happy clients ready to introduce friends and family.",
    count: 11,
    estimatedValue: 1980,
  },
  {
    id: "opp-gift",
    type: "gift",
    title: "Gift Revenue",
    description: "Birthdays, bridal parties, and seasonal gifting moments.",
    count: 8,
    estimatedValue: 1120,
  },
  {
    id: "opp-circle",
    type: "trusted_circle",
    title: "Trusted Circle Expansion",
    description: "Fill open provider slots in your clients' beauty networks.",
    count: 4,
    estimatedValue: 1700,
  },
];

export const DEMO_CAMPAIGNS: Campaign[] = [
  {
    id: "camp-birthday",
    name: "Birthday Campaign",
    type: "birthday",
    description: "Celebrate client birthdays with personalized offers and gift prompts.",
    status: "active",
    estimatedReach: 24,
  },
  {
    id: "camp-referral",
    name: "Referral Campaign",
    type: "referral",
    description: "Turn your happiest clients into warm referral channels.",
    status: "scheduled",
    estimatedReach: 11,
  },
  {
    id: "camp-mothers-day",
    name: "Mother's Day Campaign",
    type: "seasonal",
    description: "Package gifting and group bookings for Mother's Day.",
    status: "draft",
    estimatedReach: 18,
  },
  {
    id: "camp-welcome",
    name: "Trusted Circle Welcome",
    type: "welcome",
    description: "Onboard newly invited providers into your private client network.",
    status: "active",
    estimatedReach: 4,
  },
];

export const DEMO_REVENUE_SUMMARY = [
  { id: "recovered", label: "Recovered Revenue", value: 1840 },
  { id: "referral", label: "Referral Revenue", value: 1260 },
  { id: "network", label: "Network Revenue", value: 920 },
  { id: "campaign", label: "Campaign Revenue", value: 2820 },
] as const;
