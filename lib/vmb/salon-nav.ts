export type VmbSalonNavItem = {
  id: string;
  label: string;
  href: string;
  /** When false, analysis query param is not appended (e.g. Book Refresh). */
  preserveAnalysis: boolean;
};

/** Primary salon left navigation — one destination for invitation assets. */
export const VMB_SALON_NAV: VmbSalonNavItem[] = [
  { id: "home", label: "Today", href: "/vmb/today", preserveAnalysis: true },
  { id: "clients", label: "Clients", href: "/vmb/clients", preserveAnalysis: true },
  { id: "appointments", label: "Calendar", href: "/vmb/appointments", preserveAnalysis: true },
  { id: "network", label: "Network", href: "/vmb/network", preserveAnalysis: true },
  { id: "services", label: "Services", href: "/vmb/service-presets", preserveAnalysis: false },
  { id: "invitations", label: "Invitations", href: "/vmb/invites", preserveAnalysis: true },
  { id: "activity", label: "Activity", href: "/vmb/activity", preserveAnalysis: true },
  { id: "payments", label: "Payments", href: "/vmb/payments", preserveAnalysis: true },
  { id: "settings", label: "Settings", href: "/vmb/settings", preserveAnalysis: false },
];

export const VMB_SALON_MOBILE_NAV_IDS = [
  "home",
  "clients",
  "invitations",
  "activity",
  "settings",
] as const;

/** Deep-link routes kept for compatibility — not shown in primary nav. */
export const VMB_SALON_SECONDARY_ROUTES = [
  "/vmb/opportunities",
  "/vmb/offers",
  "/vmb/campaigns",
  "/vmb/queue",
] as const;
