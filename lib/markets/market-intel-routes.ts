// lib/markets/market-intel-routes.ts

import { ADMIN_WORKSPACE_ROUTES, isAdminPlatformWorkspacePath } from "@/lib/admin/workspace-routes";

export const MARKET_INTEL_ROUTES = {
  creatorDiscovery: ADMIN_WORKSPACE_ROUTES.discovery,
  markets: "/admin/markets",
  actionItems: "/admin/action-items",
} as const;

export type MarketIntelSection = "creator-discovery" | "markets" | "action-items";

export function resolveMarketIntelSection(pathname: string): MarketIntelSection | "" {
  if (
    pathname === MARKET_INTEL_ROUTES.markets ||
    pathname.startsWith(`${MARKET_INTEL_ROUTES.markets}/`)
  ) {
    return "markets";
  }
  if (
    pathname === MARKET_INTEL_ROUTES.actionItems ||
    pathname.startsWith(`${MARKET_INTEL_ROUTES.actionItems}/`)
  ) {
    return "action-items";
  }
  if (
    pathname === MARKET_INTEL_ROUTES.creatorDiscovery ||
    pathname.startsWith(`${MARKET_INTEL_ROUTES.creatorDiscovery}/`) ||
    pathname.startsWith("/admin/studios/") ||
    pathname.startsWith("/admin/intelligence/")
  ) {
    return "creator-discovery";
  }
  return "";
}

export function isMarketIntelPath(pathname: string): boolean {
  return resolveMarketIntelSection(pathname) !== "";
}

/** Market Intel + intelligence vertical pages share the unified chrome. Excludes platform workspace hubs. */
export function isMarketIntelZone(pathname: string): boolean {
  if (isAdminPlatformWorkspacePath(pathname)) return false;
  return isMarketIntelPath(pathname) || pathname.startsWith("/admin/intelligence");
}
