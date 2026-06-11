export type VmbSalonNavItem = {
  id: string;
  label: string;
  href: string;
  /** When false, analysis query param is not appended (e.g. Book Refresh). */
  preserveAnalysis: boolean;
};

export const VMB_SALON_NAV: VmbSalonNavItem[] = [
  { id: "home", label: "Home", href: "/vmb/dashboard", preserveAnalysis: true },
  { id: "refresh", label: "Book Refresh", href: "/vmb/start?mode=refresh", preserveAnalysis: false },
  { id: "network", label: "Private Client Network", href: "/vmb/network", preserveAnalysis: true },
  { id: "invites", label: "Invites", href: "/vmb/invites", preserveAnalysis: true },
  { id: "appointments", label: "Appointments", href: "/vmb/appointments", preserveAnalysis: true },
  { id: "offers", label: "Service Offers", href: "/vmb/offers", preserveAnalysis: true },
  { id: "clients", label: "Client Book", href: "/vmb/clients", preserveAnalysis: true },
  { id: "history", label: "History", href: "/vmb/history", preserveAnalysis: true },
  { id: "settings", label: "Settings", href: "/vmb/settings", preserveAnalysis: true },
];

export const VMB_SALON_MOBILE_NAV_IDS = ["home", "invites", "clients", "network"] as const;
