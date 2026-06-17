// lib/admin/invites-workspace.ts
// Canonical VMB invite admin routes — configuration and catalog only.

import { ADMIN_WORKSPACE_ROUTES } from "@/lib/admin/workspace-routes";

export const INVITES_ADMIN_ROUTES = {
  hub: ADMIN_WORKSPACE_ROUTES.invites,
  templates: "/admin/invites/offers",
  nailCatalog: "/admin/invites/nails",
  offers: "/admin/invites/offers",
  services: ADMIN_WORKSPACE_ROUTES.serviceCatalog,
  outreach: "/admin/invites/outreach",
  queue: "/admin/invites/queue",
  sent: "/admin/invites/sent",
  claims: "/admin/invites/claims",
  opens: "/admin/invites/opens",
  conversions: "/admin/invites/conversions",
} as const;

export type InvitesOperatingCardStatus = "live" | "partial" | "placeholder";

export type InvitesOperatingCard = {
  id: string;
  label: string;
  description: string;
  href: string;
  status: InvitesOperatingCardStatus;
};

/** Primary workbench on /admin/invites */
export const INVITES_BUILDER_HUB = {
  id: "template-library",
  title: "Template Library",
  description: "Edit invite templates, services, rewards, and preview the client card.",
  href: INVITES_ADMIN_ROUTES.offers,
} as const;

export type InvitesHubLink = {
  id: string;
  label: string;
  href: string;
};

/** Subordinate text links below the primary workbench card */
export const INVITES_HUB_SECONDARY_LINKS: InvitesHubLink[] = [
  { id: "services", label: "Services", href: INVITES_ADMIN_ROUTES.services },
  { id: "outreach", label: "Outreach Messages", href: INVITES_ADMIN_ROUTES.outreach },
  { id: "queue", label: "Invite Queue", href: INVITES_ADMIN_ROUTES.queue },
  { id: "sent", label: "Sent Invites", href: INVITES_ADMIN_ROUTES.sent },
];

/** Muted analytics links — routes remain, not promoted on the hub */
export const INVITES_HUB_COMING_LATER: InvitesHubLink[] = [
  { id: "claims", label: "Claims", href: INVITES_ADMIN_ROUTES.claims },
  { id: "opens", label: "Opens", href: INVITES_ADMIN_ROUTES.opens },
  { id: "conversions", label: "Conversions", href: INVITES_ADMIN_ROUTES.conversions },
];

/** All admin area routes — used for route existence checks */
export const INVITES_OPERATING_CARDS: InvitesOperatingCard[] = [
  {
    id: "template-library",
    label: INVITES_BUILDER_HUB.title,
    description: INVITES_BUILDER_HUB.description,
    href: INVITES_BUILDER_HUB.href,
    status: "live",
  },
  {
    id: "nail-catalog",
    label: "Nail Invite Catalog",
    description: "Legacy catalog view — use Template Library for day-to-day editing.",
    href: INVITES_ADMIN_ROUTES.nailCatalog,
    status: "live",
  },
  ...INVITES_HUB_SECONDARY_LINKS.map((link) => ({
    id: link.id,
    label: link.label,
    description: "",
    href: link.href,
    status: (link.id === "queue" || link.id === "sent" ? "partial" : "live") as InvitesOperatingCardStatus,
  })),
  ...INVITES_HUB_COMING_LATER.map((link) => ({
    id: link.id,
    label: link.label,
    description: "",
    href: link.href,
    status: "placeholder" as InvitesOperatingCardStatus,
  })),
];

export const INVITES_CANONICAL_ADMIN_ROUTES = [
  INVITES_ADMIN_ROUTES.offers,
  INVITES_ADMIN_ROUTES.nailCatalog,
  INVITES_ADMIN_ROUTES.outreach,
] as const;

export const INVITES_LEGACY_VMB_ADMIN_REDIRECTS = [
  { from: "/vmb/admin/templates", to: INVITES_ADMIN_ROUTES.offers },
  { from: "/vmb/admin/offers", to: INVITES_ADMIN_ROUTES.offers },
  { from: "/vmb/admin/services", to: INVITES_ADMIN_ROUTES.services },
] as const;

export function invitesOperatingCard(id: string): InvitesOperatingCard | undefined {
  return INVITES_OPERATING_CARDS.find((card) => card.id === id);
}
