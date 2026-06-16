export type VmbSalonNavItem = {
  id: string;
  label: string;
  href: string;
  /** When false, analysis query param is not appended (e.g. Book Refresh). */
  preserveAnalysis: boolean;
};

export const VMB_SALON_NAV: VmbSalonNavItem[] = [
  { id: "home", label: "Today", href: "/vmb/today", preserveAnalysis: true },
  { id: "clients", label: "Clients", href: "/vmb/clients", preserveAnalysis: true },
  { id: "appointments", label: "Calendar", href: "/vmb/appointments", preserveAnalysis: true },
  { id: "network", label: "Network", href: "/vmb/network", preserveAnalysis: true },
  { id: "opportunities", label: "Opportunities", href: "/vmb/opportunities", preserveAnalysis: true },
  { id: "services", label: "Services", href: "/vmb/service-presets", preserveAnalysis: false },
  { id: "offers", label: "Offers", href: "/vmb/offers", preserveAnalysis: false },
  { id: "campaigns", label: "Campaigns", href: "/vmb/campaigns", preserveAnalysis: true },
  { id: "invites", label: "Invites", href: "/vmb/invites", preserveAnalysis: true },
  { id: "queue", label: "Queue", href: "/vmb/queue", preserveAnalysis: true },
  { id: "activity", label: "Activity", href: "/vmb/activity", preserveAnalysis: true },
  { id: "payments", label: "Payments", href: "/vmb/payments", preserveAnalysis: true },
  { id: "settings", label: "Settings", href: "/vmb/settings", preserveAnalysis: false },
];

export const VMB_SALON_MOBILE_NAV_IDS = ["home", "clients", "opportunities", "queue", "activity"] as const;
