import type { AiosAction, AiosPageContext, AiosPageId } from "@/lib/taikos/types";

const PAGE_ACTIONS: Record<AiosPageId, AiosAction[]> = {
  dashboard: [
    { id: "view-invites", label: "Preview Invites", kind: "open_invites", href: "/vmb/invites" },
    { id: "view-clients", label: "View Clients", kind: "open_clients", href: "/vmb/clients" },
  ],
  calendar: [
    { id: "view-appointments", label: "Open Calendar", kind: "navigate", href: "/vmb/appointments" },
  ],
  clients: [
    { id: "this-week", label: "View Clients", kind: "open_clients", href: "/vmb/clients?view=this-week" },
  ],
  network: [
    { id: "network-invites", label: "Continue PCN", kind: "open_network", href: "/vmb/network" },
  ],
  offers: [{ id: "manage-offers", label: "Service Offers", kind: "navigate", href: "/vmb/offers" }],
  campaigns: [{ id: "history", label: "Build Campaign", kind: "navigate", href: "/vmb/history" }],
  invites: [
    { id: "approve-drafts", label: "Preview Invite", kind: "open_invites", href: "/vmb/invites" },
  ],
  appointments: [
    { id: "fill-slots", label: "Open Calendar", kind: "navigate", href: "/vmb/appointments" },
  ],
  history: [{ id: "view-history", label: "View Details", kind: "navigate", href: "/vmb/history" }],
  settings: [{ id: "settings", label: "Profile", kind: "navigate", href: "/vmb/settings" }],
  refresh: [{ id: "refresh-book", label: "Refresh book", kind: "refresh_book", href: "/vmb/start?mode=refresh" }],
  unknown: [{ id: "home", label: "Go to Home", kind: "navigate", href: "/vmb/dashboard" }],
};

const PAGE_META: Record<
  AiosPageId,
  { title: string; headerTitle: string; description: string; assistantIntro: string }
> = {
  dashboard: {
    title: "Home",
    headerTitle: "Home",
    description: "Weekly operating feed and relationship moves.",
    assistantIntro: "You are on your weekly home feed. I can summarize moves, invites, and revenue opportunities.",
  },
  calendar: {
    title: "Calendar",
    headerTitle: "Calendar",
    description: "Appointment windows and fill opportunities.",
    assistantIntro:
      "You are viewing Calendar. I can help find open slots, likely bookings, overdue clients, and appointment gaps.",
  },
  clients: {
    title: "Client Book",
    headerTitle: "Clients",
    description: "Imported clients, tags, and opportunity signals.",
    assistantIntro:
      "You are viewing Clients. I can help identify high-value clients, overdue clients, birthdays, and referral opportunities.",
  },
  network: {
    title: "Private Client Network",
    headerTitle: "Network",
    description: "Network growth and trusted introductions.",
    assistantIntro:
      "You are viewing your Private Client Network. I can help explain new joins, referrals, and next invitations.",
  },
  offers: {
    title: "Service Offers",
    headerTitle: "Offers",
    description: "Standard offers and service presets.",
    assistantIntro: "You are viewing Offers. I can help explain presets and which offers fit this week's moves.",
  },
  campaigns: {
    title: "Campaigns",
    headerTitle: "Campaigns",
    description: "Outreach history and campaign performance.",
    assistantIntro: "You are viewing Campaigns. I can help review outreach history and next campaign ideas.",
  },
  invites: {
    title: "Invites",
    headerTitle: "Invites",
    description: "Draft, approve, and manage client messages.",
    assistantIntro: "You are viewing Invites. I can help prioritize drafts, welcomes, and revenue touches.",
  },
  appointments: {
    title: "Appointments",
    headerTitle: "Calendar",
    description: "Open slots and fill options from your book.",
    assistantIntro:
      "You are viewing Calendar. I can help find open slots, likely bookings, overdue clients, and appointment gaps.",
  },
  history: {
    title: "History",
    headerTitle: "Campaigns",
    description: "Past moves and outreach history.",
    assistantIntro: "You are viewing Campaigns. I can help explain what ran and what to repeat.",
  },
  settings: {
    title: "Settings",
    headerTitle: "Profile",
    description: "Salon workspace preferences.",
    assistantIntro: "You are viewing Profile and salon settings.",
  },
  refresh: {
    title: "Book Refresh",
    headerTitle: "Book Refresh",
    description: "Upload a fresh client export.",
    assistantIntro: "You are refreshing your client book.",
  },
  unknown: {
    title: "VMB",
    headerTitle: "VMB",
    description: "Salon operating workspace.",
    assistantIntro: "You are in your salon workspace.",
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
    assistantIntro: meta.assistantIntro,
    availableActions: PAGE_ACTIONS[pageId],
  };
}

export function pageHeaderTitle(pathname: string): string {
  return PAGE_META[pathnameToPageId(pathname)].headerTitle;
}

export function pageAssistantIntro(pathname: string): string {
  return PAGE_META[pathnameToPageId(pathname)].assistantIntro;
}
