// lib/markets/market-intel-routes.ts

export const MARKET_INTEL_ROUTES = {
  creatorDiscovery: "/admin/studios",
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
    pathname.startsWith("/admin/studios/") ||
    pathname.startsWith("/admin/intelligence/salon")
  ) {
    return "creator-discovery";
  }
  return "";
}

export function isMarketIntelPath(pathname: string): boolean {
  return resolveMarketIntelSection(pathname) !== "";
}
