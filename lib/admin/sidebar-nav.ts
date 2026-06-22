// lib/admin/sidebar-nav.ts
// Top-level admin sidebar accordion groups — Platform Admin, Market Intel, Settings.

import { Terminal, ScrollText, type LucideIcon } from "lucide-react";
import {
  ADMIN_WORKSPACE_NAV,
  isAdminPlatformWorkspacePath,
} from "@/lib/admin/workspace-routes";
import {
  MARKET_INTEL_ROUTES,
  isMarketIntelPath,
  resolveMarketIntelSection,
  type MarketIntelSection,
} from "@/lib/markets/market-intel-routes";

export const SIDEBAR_ACCORDION_GROUP_IDS = {
  platformAdmin: "platform-admin",
  marketIntel: "market-intel",
  settings: "settings",
} as const;

export type SidebarAccordionGroupId =
  (typeof SIDEBAR_ACCORDION_GROUP_IDS)[keyof typeof SIDEBAR_ACCORDION_GROUP_IDS];

export type SidebarNavItem = {
  href: string;
  label: string;
};

export type SettingsSidebarNavItem = SidebarNavItem & {
  icon: LucideIcon | null;
};

export const SIDEBAR_ACCORDION_GROUPS = {
  platformAdmin: {
    id: SIDEBAR_ACCORDION_GROUP_IDS.platformAdmin,
    label: "Platform Admin",
    defaultHref: ADMIN_WORKSPACE_NAV[0]?.href ?? "/admin/discovery",
  },
  marketIntel: {
    id: SIDEBAR_ACCORDION_GROUP_IDS.marketIntel,
    label: "Market Intel",
    defaultHref: MARKET_INTEL_ROUTES.creatorDiscovery,
  },
  settings: {
    id: SIDEBAR_ACCORDION_GROUP_IDS.settings,
    label: "Settings",
    defaultHref: "/settings",
  },
} as const;

export const PLATFORM_ADMIN_SIDEBAR_ITEMS: SidebarNavItem[] = ADMIN_WORKSPACE_NAV
  .filter(({ id }) => id !== "invites")
  .map(({ label, href }) => ({ href, label }));

export const MARKET_INTEL_SIDEBAR_ITEMS: SidebarNavItem[] = [
  { href: MARKET_INTEL_ROUTES.creatorDiscovery, label: "Creator Discovery" },
  { href: MARKET_INTEL_ROUTES.markets, label: "Markets" },
  { href: MARKET_INTEL_ROUTES.actionItems, label: "Action Items" },
];

export const SETTINGS_ADMIN_SIDEBAR_ITEMS: SettingsSidebarNavItem[] = [
  { href: "/settings", label: "Settings", icon: null },
  { href: "/admin/tools", label: "Tools & foundation", icon: Terminal },
  { href: "/admin/activity", label: "Activity Log", icon: ScrollText },
];

/** Platform Admin workspace hubs only — not Market Intel tool routes. */
export function isPlatformAdminSidebarActive(pathname: string): boolean {
  return isAdminPlatformWorkspacePath(pathname);
}

/** Market Intel vertical routes — excludes Platform Admin workspace hubs. */
export function isMarketIntelSidebarActive(pathname: string): boolean {
  return isMarketIntelPath(pathname);
}

export function isSettingsSidebarRoute(pathname: string): boolean {
  return SETTINGS_ADMIN_SIDEBAR_ITEMS.some((item) => {
    if (item.href === "/settings") {
      return pathname === "/settings" || pathname.startsWith("/settings/");
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  });
}

/** Settings accordion highlight — only settings/tools/activity, not platform or market intel admin. */
export function isSettingsSidebarActive(pathname: string): boolean {
  return isSettingsSidebarRoute(pathname);
}

export function isPlatformAdminNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const MARKET_INTEL_SECTION_BY_HREF: Record<string, MarketIntelSection> = {
  [MARKET_INTEL_ROUTES.creatorDiscovery]: "creator-discovery",
  [MARKET_INTEL_ROUTES.markets]: "markets",
  [MARKET_INTEL_ROUTES.actionItems]: "action-items",
};

export function isMarketIntelNavItemActive(pathname: string, href: string): boolean {
  const section = resolveMarketIntelSection(pathname);
  const expected = MARKET_INTEL_SECTION_BY_HREF[href];
  if (expected) return section === expected;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Guardrail — Market Intel must remain a sibling accordion, not nested under Platform Admin. */
export function isMarketIntelNestedUnderPlatformAdmin(): boolean {
  const platformHrefs = new Set(PLATFORM_ADMIN_SIDEBAR_ITEMS.map((item) => item.href));
  return MARKET_INTEL_SIDEBAR_ITEMS.some((item) => platformHrefs.has(item.href));
}
