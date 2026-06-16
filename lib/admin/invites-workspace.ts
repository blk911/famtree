// lib/admin/invites-workspace.ts
// Canonical VMB invite admin routes — configuration and catalog only.

import { ADMIN_WORKSPACE_ROUTES } from "@/lib/admin/workspace-routes";

export const INVITES_ADMIN_ROUTES = {
  hub: ADMIN_WORKSPACE_ROUTES.invites,
  templates: "/admin/invites/templates",
  offers: "/admin/invites/offers",
  services: "/admin/invites/services",
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

/** Primary operating cards on /admin/invites */
export const INVITES_OPERATING_CARDS: InvitesOperatingCard[] = [
  {
    id: "templates",
    label: "Card Templates",
    description: "Relationship copy templates for PCN, birthday, reactivation, and outreach cards.",
    href: INVITES_ADMIN_ROUTES.templates,
    status: "live",
  },
  {
    id: "offers",
    label: "Offers",
    description: "Salon offer catalog linked to services and card preview slots.",
    href: INVITES_ADMIN_ROUTES.offers,
    status: "live",
  },
  {
    id: "services",
    label: "Services",
    description: "Service and option catalog referenced by offers and cards.",
    href: INVITES_ADMIN_ROUTES.services,
    status: "live",
  },
  {
    id: "outreach",
    label: "Outreach Messages",
    description: "Send/preview modal subject, body, footer, and channel copy presets.",
    href: INVITES_ADMIN_ROUTES.outreach,
    status: "live",
  },
  {
    id: "queue",
    label: "Invite Queue",
    description: "Approved invites awaiting send — read-only admin view of the tAIkOS queue.",
    href: INVITES_ADMIN_ROUTES.queue,
    status: "partial",
  },
  {
    id: "sent",
    label: "Sent Invites",
    description: "Draft and sent invite activity for the active salon trial.",
    href: INVITES_ADMIN_ROUTES.sent,
    status: "partial",
  },
  {
    id: "claims",
    label: "Claims",
    description: "CTA claim events when clients tap card actions.",
    href: INVITES_ADMIN_ROUTES.claims,
    status: "placeholder",
  },
  {
    id: "opens",
    label: "Opens",
    description: "Invite open and read tracking across channels.",
    href: INVITES_ADMIN_ROUTES.opens,
    status: "placeholder",
  },
  {
    id: "conversions",
    label: "Conversions",
    description: "Bookings and revenue attributed to invite outreach.",
    href: INVITES_ADMIN_ROUTES.conversions,
    status: "placeholder",
  },
];

export const INVITES_CANONICAL_ADMIN_ROUTES = [
  INVITES_ADMIN_ROUTES.templates,
  INVITES_ADMIN_ROUTES.offers,
  INVITES_ADMIN_ROUTES.services,
  INVITES_ADMIN_ROUTES.outreach,
] as const;

export const INVITES_LEGACY_VMB_ADMIN_REDIRECTS = [
  { from: "/vmb/admin/templates", to: INVITES_ADMIN_ROUTES.templates },
  { from: "/vmb/admin/offers", to: INVITES_ADMIN_ROUTES.offers },
  { from: "/vmb/admin/services", to: INVITES_ADMIN_ROUTES.services },
] as const;

export function invitesOperatingCard(id: string): InvitesOperatingCard | undefined {
  return INVITES_OPERATING_CARDS.find((card) => card.id === id);
}
