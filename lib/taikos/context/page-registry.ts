import type { AiosAction, AiosPageContext, AiosPageId } from "@/lib/taikos/types";

const PAGE_ACTIONS: Record<AiosPageId, AiosAction[]> = {
  dashboard: [
    { id: "view-invites", label: "Preview invites", kind: "open_invites", href: "/vmb/invites" },
    { id: "view-clients", label: "Open client book", kind: "open_clients", href: "/vmb/clients" },
  ],
  calendar: [
    { id: "view-appointments", label: "Review openings", kind: "navigate", href: "/vmb/appointments" },
  ],
  clients: [
    { id: "this-week", label: "This week's moves", kind: "navigate", href: "/vmb/clients?view=this-week" },
  ],
  network: [
    { id: "network-invites", label: "Network invites", kind: "open_invites", href: "/vmb/invites?section=private_client_network" },
  ],
  offers: [{ id: "manage-offers", label: "Service offers", kind: "navigate", href: "/vmb/offers" }],
  campaigns: [{ id: "history", label: "Campaign history", kind: "navigate", href: "/vmb/history" }],
  invites: [
    { id: "approve-drafts", label: "Review drafts", kind: "open_invites", href: "/vmb/invites" },
  ],
  appointments: [
    { id: "fill-slots", label: "Fill opportunities", kind: "navigate", href: "/vmb/appointments" },
  ],
  history: [{ id: "view-history", label: "View history", kind: "navigate", href: "/vmb/history" }],
  settings: [{ id: "settings", label: "Salon settings", kind: "navigate", href: "/vmb/settings" }],
  refresh: [{ id: "refresh-book", label: "Refresh book", kind: "refresh_book", href: "/vmb/start?mode=refresh" }],
  unknown: [{ id: "home", label: "Go to Home", kind: "navigate", href: "/vmb/dashboard" }],
};

const PAGE_META: Record<
  AiosPageId,
  { title: string; description: string; assistantLine: string }
> = {
  dashboard: {
    title: "Home",
    description: "Weekly operating feed and relationship moves.",
    assistantLine: "You're on your weekly home feed.",
  },
  calendar: {
    title: "Calendar",
    description: "Appointment windows and fill opportunities.",
    assistantLine: "You're viewing your calendar.",
  },
  clients: {
    title: "Client Book",
    description: "Imported clients, tags, and opportunity signals.",
    assistantLine: "You're viewing your client book.",
  },
  network: {
    title: "Private Client Network",
    description: "Network growth and trusted introductions.",
    assistantLine: "You're viewing your private client network.",
  },
  offers: {
    title: "Service Offers",
    description: "Standard offers and service presets.",
    assistantLine: "You're viewing service offers.",
  },
  campaigns: {
    title: "Campaigns",
    description: "Outreach history and campaign performance.",
    assistantLine: "You're viewing campaigns.",
  },
  invites: {
    title: "Invites",
    description: "Draft, approve, and manage client messages.",
    assistantLine: "You're reviewing invite drafts.",
  },
  appointments: {
    title: "Appointments",
    description: "Open slots and fill options from your book.",
    assistantLine: "You're viewing appointment opportunities.",
  },
  history: {
    title: "History",
    description: "Past moves and outreach history.",
    assistantLine: "You're viewing history.",
  },
  settings: {
    title: "Settings",
    description: "Salon workspace preferences.",
    assistantLine: "You're in salon settings.",
  },
  refresh: {
    title: "Book Refresh",
    description: "Upload a fresh client export.",
    assistantLine: "You're refreshing your client book.",
  },
  unknown: {
    title: "VMB",
    description: "Salon operating workspace.",
    assistantLine: "You're in your salon workspace.",
  },
};

export function pathnameToPageId(pathname: string): AiosPageId {
  if (pathname === "/vmb/dashboard" || pathname.startsWith("/vmb/dashboard/")) return "dashboard";
  if (pathname === "/vmb/clients") return "clients";
  if (pathname === "/vmb/network") return "network";
  if (pathname === "/vmb/offers") return "offers";
  if (pathname === "/vmb/campaigns") return "campaigns";
  if (pathname === "/vmb/invites") return "invites";
  if (pathname === "/vmb/appointments") return "appointments";
  if (pathname === "/vmb/history") return "history";
  if (pathname === "/vmb/settings") return "settings";
  if (pathname === "/vmb/start") return "refresh";
  return "unknown";
}

export function resolvePageContext(pathname: string, searchParams?: URLSearchParams): AiosPageContext {
  const pageId = pathnameToPageId(pathname);
  const meta = PAGE_META[pageId];
  const mode = searchParams?.get("mode");
  const description =
    pageId === "refresh" && mode === "refresh"
      ? "Upload a fresh export to update this week's moves."
      : meta.description;

  return {
    pageId,
    title: meta.title,
    description,
    availableActions: PAGE_ACTIONS[pageId],
  };
}

export function pageAssistantLine(pathname: string): string {
  return PAGE_META[pathnameToPageId(pathname)].assistantLine;
}
