// lib/admin/workspace-routes.ts
// AIH platform admin workspaces — links to existing engines (no duplicated parsers/resolvers).

export type AdminWorkspaceId =
  | "discovery"
  | "social"
  | "operators"
  | "members"
  | "invites"
  | "service-catalog"
  | "vmb-salons";

export type WorkspaceLink = {
  label: string;
  description: string;
  href: string;
  legacy?: boolean;
  comingSoon?: boolean;
  external?: boolean;
};

export type WorkspaceSection = {
  title: string;
  description?: string;
  links: WorkspaceLink[];
};

export const ADMIN_WORKSPACE_ROUTES = {
  discovery: "/admin/discovery",
  social: "/admin/social",
  operators: "/admin/operators",
  members: "/admin/members",
  invites: "/admin/invites",
  serviceCatalog: "/admin/service-catalog",
  vmbSalons: "/admin/products/vmb-salons",
} as const;

export const ADMIN_WORKSPACE_NAV: Array<{
  id: AdminWorkspaceId;
  label: string;
  href: string;
  product?: boolean;
}> = [
  { id: "discovery", label: "Discovery", href: ADMIN_WORKSPACE_ROUTES.discovery },
  { id: "social", label: "Social", href: ADMIN_WORKSPACE_ROUTES.social },
  { id: "operators", label: "Operators", href: ADMIN_WORKSPACE_ROUTES.operators },
  { id: "members", label: "Members", href: ADMIN_WORKSPACE_ROUTES.members },
  { id: "invites", label: "Invites", href: ADMIN_WORKSPACE_ROUTES.invites },
  { id: "service-catalog", label: "Service Catalog", href: ADMIN_WORKSPACE_ROUTES.serviceCatalog },
  { id: "vmb-salons", label: "VMB Salons", href: ADMIN_WORKSPACE_ROUTES.vmbSalons, product: true },
];

export const DISCOVERY_WORKSPACE_SECTIONS: WorkspaceSection[] = [
  {
    title: "Source intake",
    description: "IG harvest, booking directories, and seed imports — single engine in lib/intelligence/salon.",
    links: [
      {
        label: "Hashtag Harvest",
        description: "Instagram hashtag discovery and operator harvest.",
        href: "/admin/studios/creator-lab/hashtag-harvest",
      },
      {
        label: "Source URL / Directory ingest",
        description: "Vagaro, GlossGenius, Sola, and generic directory pulls.",
        href: "/admin/studios/source-ingest",
      },
      {
        label: "GlossGenius seed discovery",
        description: "GG directory seed intake and candidate promotion.",
        href: "/admin/studios/ggen-discovery",
      },
      {
        label: "Sola / suite directory",
        description: "Sola market directory and suite listings.",
        href: "/admin/markets/sola",
      },
      {
        label: "Back office import",
        description: "Salon back-office CSV / record import.",
        href: "/admin/intelligence/salon/backoffice",
      },
    ],
  },
  {
    title: "Resolve · dedupe · confidence",
    description: "Resolver, ranking, and enrichment — reuses existing salon intelligence engines.",
    links: [
      {
        label: "Public presence",
        description: "Cross-source public URL and profile resolution.",
        href: "/admin/studios/public-presence",
      },
      {
        label: "IG resolver / URL backfill",
        description: "Instagram handle resolver and stub backfill.",
        href: "/admin/studios/creator-lab/ig-stubs",
      },
      {
        label: "Business stack",
        description: "Booking provider fingerprinting and stack detection.",
        href: "/admin/studios/business-stack",
      },
      {
        label: "Google identity",
        description: "Places match, conflict review, and identity confidence.",
        href: "/admin/studios/google-identity",
      },
      {
        label: "Provider provenance",
        description: "Source evidence and provenance audit trail.",
        href: "/admin/studios/provider-provenance",
      },
      {
        label: "Provider audit",
        description: "Validation runs and booking signal checks.",
        href: "/admin/studios/provider-audit",
      },
    ],
  },
  {
    title: "Runs & status",
    links: [
      {
        label: "Source run history",
        description: "Latest ingest runs, artifacts, and handoff status.",
        href: "/admin/studios/source-runs",
      },
      {
        label: "Pipeline run history",
        description: "Full pipeline audit log and re-run controls.",
        href: "/admin/studios/runs",
      },
      {
        label: "Harvest analytics",
        description: "Harvest volume and resolver throughput.",
        href: "/admin/studios/harvest-analytics",
      },
      {
        label: "Legacy studio hub",
        description: "Original /admin/studios overview — tooling routes remain here.",
        href: "/admin/studios",
        legacy: true,
      },
    ],
  },
];

export const SOCIAL_WORKSPACE_SECTIONS: WorkspaceSection[] = [
  {
    title: "Salon-owned social",
    description: "Connected account model and ingest placeholders — publishing hooks coming soon.",
    links: [
      {
        label: "Public presence & social URLs",
        description: "Resolved IG and social links from discovery pipeline.",
        href: "/admin/studios/public-presence",
      },
      {
        label: "IG resolver",
        description: "Handle resolution and URL backfill for salon operators.",
        href: "/admin/studios/creator-lab/ig-stubs",
      },
      {
        label: "Social auth (placeholder)",
        description: "OAuth connection flow for salon-owned Instagram — not yet wired.",
        href: "/admin/social#connected-accounts",
        comingSoon: true,
      },
      {
        label: "Social ingest status (placeholder)",
        description: "Per-account ingest health and last sync — not yet wired.",
        href: "/admin/social#ingest-status",
        comingSoon: true,
      },
      {
        label: "Publishing hooks (placeholder)",
        description: "Future outbound post / story scheduling surface.",
        href: "/admin/social#publishing",
        comingSoon: true,
      },
    ],
  },
];

export const OPERATORS_WORKSPACE_SECTIONS: WorkspaceSection[] = [
  {
    title: "Canonical operator records",
    links: [
      {
        label: "Qualified operators",
        description: "Resolver-qualified salon / tech records ready for outreach.",
        href: "/admin/studios/qualified-operators",
      },
      {
        label: "Prospects",
        description: "Pipeline prospects with identity and booking context.",
        href: "/admin/studios/prospects",
      },
      {
        label: "Import candidates",
        description: "Candidates awaiting promotion into operator records.",
        href: "/admin/studios/import-candidates",
      },
      {
        label: "Studio assembler",
        description: "Assemble operator studio profiles from discovery signals.",
        href: "/admin/studios/creator-lab",
      },
    ],
  },
  {
    title: "Identity & evidence",
    links: [
      {
        label: "Business stack / booking links",
        description: "Vagaro, GlossGenius, and other booking provider URLs.",
        href: "/admin/studios/business-stack",
      },
      {
        label: "Provider provenance",
        description: "Confidence scores and source evidence summaries.",
        href: "/admin/studios/provider-provenance",
      },
      {
        label: "Google identity",
        description: "Owner / location identity match review.",
        href: "/admin/studios/google-identity",
      },
    ],
  },
];

export const MEMBERS_WORKSPACE_SECTIONS: WorkspaceSection[] = [
  {
    title: "Salon members & clients",
    links: [
      {
        label: "VMB client roster",
        description: "Active salon trial clients and visit context.",
        href: "/vmb/clients",
        external: true,
      },
      {
        label: "Private client network",
        description: "PCN membership and network graph (salon product view).",
        href: "/vmb/network",
        external: true,
      },
      {
        label: "Incomplete profiles (placeholder)",
        description: "Members missing contact or preference fields.",
        href: "/admin/members#incomplete",
        comingSoon: true,
      },
      {
        label: "Invite relationships (placeholder)",
        description: "Who invited whom — referral graph surface.",
        href: "/admin/members#referrals",
        comingSoon: true,
      },
    ],
  },
  {
    title: "Platform members",
    links: [
      {
        label: "AIH admin members",
        description: "Family network member admin and identity queue.",
        href: "/admin",
      },
    ],
  },
];

/** @deprecated Use lib/admin/invites-workspace.ts — retained for workspace hub compatibility. */
export const INVITES_WORKSPACE_SECTIONS: WorkspaceSection[] = [
  {
    title: "Configuration (canonical)",
    links: [
      {
        label: "Templates",
        description: "Card relationship copy templates.",
        href: "/admin/invites/templates",
      },
      {
        label: "Offers",
        description: "Salon offer catalog.",
        href: "/admin/invites/offers",
      },
      {
        label: "Services",
        description: "Service and option catalog.",
        href: "/admin/invites/services",
      },
    ],
  },
  {
    title: "Operations",
    links: [
      {
        label: "Invite queue",
        description: "Read-only admin queue view.",
        href: "/admin/invites/queue",
      },
      {
        label: "Sent invites",
        description: "Draft and sent activity.",
        href: "/admin/invites/sent",
      },
      {
        label: "Claims",
        description: "CTA claim tracking (placeholder).",
        href: "/admin/invites/claims",
        comingSoon: true,
      },
      {
        label: "Opens",
        description: "Open/read tracking (placeholder).",
        href: "/admin/invites/opens",
        comingSoon: true,
      },
      {
        label: "Conversions",
        description: "Booking attribution (placeholder).",
        href: "/admin/invites/conversions",
        comingSoon: true,
      },
    ],
  },
  {
    title: "Legacy paths",
    links: [
      {
        label: "Legacy VMB admin templates",
        description: "Deprecated — redirects to /admin/invites/templates.",
        href: "/vmb/admin/templates",
        legacy: true,
      },
      {
        label: "Legacy VMB admin offers",
        description: "Deprecated — redirects to /admin/invites/offers.",
        href: "/vmb/admin/offers",
        legacy: true,
      },
      {
        label: "Legacy VMB admin services",
        description: "Deprecated — redirects to /admin/invites/services.",
        href: "/vmb/admin/services",
        legacy: true,
      },
    ],
  },
];

export const VMB_SALONS_PRODUCT_SECTIONS: WorkspaceSection[] = [
  {
    title: "Invite operating center",
    description: "Configure templates, offers, services, and monitor invite outcomes.",
    links: [
      {
        label: "VMB Invites operating center",
        description: "Primary admin workspace for card templates, catalogs, queue, and analytics.",
        href: ADMIN_WORKSPACE_ROUTES.invites,
      },
      {
        label: "Card templates",
        description: "Relationship copy for outreach cards.",
        href: "/admin/invites/templates",
      },
      {
        label: "Offer catalog",
        description: "Salon offers linked to services.",
        href: "/admin/invites/offers",
      },
      {
        label: "Service catalog",
        description: "Canonical VMB service menu — categories, services, and add-ons.",
        href: ADMIN_WORKSPACE_ROUTES.serviceCatalog,
      },
    ],
  },
  {
    title: "Product operations",
    description: "VMB Salons product views only — discovery/resolver engines live under Platform workspaces.",
    links: [
      {
        label: "Salon services",
        description: "Salon owners turn on services, prices, and add-ons.",
        href: "/vmb/services",
        external: true,
      },
      {
        label: "Salon dashboard",
        description: "Operator Today view, opportunities, and readiness.",
        href: "/vmb/today",
        external: true,
      },
      {
        label: "Campaigns",
        description: "Active and planned outreach campaigns.",
        href: "/vmb/campaigns",
        external: true,
      },
      {
        label: "Goals & readiness",
        description: "Salon goals and activation checklist.",
        href: "/vmb/goals",
        external: true,
      },
      {
        label: "Onboarding / start",
        description: "New salon trial onboarding flow.",
        href: "/vmb/start",
        external: true,
      },
    ],
  },
  {
    title: "Platform workspaces",
    description: "Shared AIH/VMB services — do not duplicate engines in the product shell.",
    links: [
      { label: "Discovery", description: "Source intake and resolver pipeline.", href: ADMIN_WORKSPACE_ROUTES.discovery },
      { label: "Social", description: "Salon social connections and ingest.", href: ADMIN_WORKSPACE_ROUTES.social },
      { label: "Operators", description: "Canonical salon / operator records.", href: ADMIN_WORKSPACE_ROUTES.operators },
      { label: "Members", description: "Clients and member relationships.", href: ADMIN_WORKSPACE_ROUTES.members },
      { label: "Invites", description: "Templates, queues, and card preview.", href: ADMIN_WORKSPACE_ROUTES.invites },
    ],
  },
];

export function resolveAdminWorkspaceId(pathname: string): AdminWorkspaceId | "" {
  if (pathname === ADMIN_WORKSPACE_ROUTES.discovery || pathname.startsWith(`${ADMIN_WORKSPACE_ROUTES.discovery}/`)) {
    return "discovery";
  }
  if (pathname === ADMIN_WORKSPACE_ROUTES.social || pathname.startsWith(`${ADMIN_WORKSPACE_ROUTES.social}/`)) {
    return "social";
  }
  if (pathname === ADMIN_WORKSPACE_ROUTES.operators || pathname.startsWith(`${ADMIN_WORKSPACE_ROUTES.operators}/`)) {
    return "operators";
  }
  if (pathname === ADMIN_WORKSPACE_ROUTES.members || pathname.startsWith(`${ADMIN_WORKSPACE_ROUTES.members}/`)) {
    return "members";
  }
  if (pathname === ADMIN_WORKSPACE_ROUTES.invites || pathname.startsWith(`${ADMIN_WORKSPACE_ROUTES.invites}/`)) {
    return "invites";
  }
  if (
    pathname === ADMIN_WORKSPACE_ROUTES.serviceCatalog ||
    pathname.startsWith(`${ADMIN_WORKSPACE_ROUTES.serviceCatalog}/`)
  ) {
    return "service-catalog";
  }
  if (
    pathname === ADMIN_WORKSPACE_ROUTES.vmbSalons ||
    pathname.startsWith(`${ADMIN_WORKSPACE_ROUTES.vmbSalons}/`)
  ) {
    return "vmb-salons";
  }
  return "";
}

export function isAdminPlatformWorkspacePath(pathname: string): boolean {
  return resolveAdminWorkspaceId(pathname) !== "";
}

/** All workspace hub paths — used for smoke tests and nav resolution. */
export const ADMIN_PLATFORM_HUB_PATHS = [
  ADMIN_WORKSPACE_ROUTES.discovery,
  ADMIN_WORKSPACE_ROUTES.social,
  ADMIN_WORKSPACE_ROUTES.operators,
  ADMIN_WORKSPACE_ROUTES.members,
  ADMIN_WORKSPACE_ROUTES.invites,
  ADMIN_WORKSPACE_ROUTES.serviceCatalog,
  ADMIN_WORKSPACE_ROUTES.vmbSalons,
  "/admin/invites/templates",
  "/admin/invites/offers",
  "/admin/invites/services",
  "/admin/invites/queue",
  "/admin/invites/sent",
  "/admin/invites/claims",
  "/admin/invites/opens",
  "/admin/invites/conversions",
] as const;
