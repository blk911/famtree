"use client";
// components/admin/MarketIntelNav.tsx
// Primary workflow navigation — Discovery → Markets → Action Items

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MARKET_INTEL_ROUTES,
  resolveMarketIntelSection,
  type MarketIntelSection,
} from "@/lib/markets/market-intel-routes";

const SECTIONS: Array<{ key: MarketIntelSection; label: string; href: string }> = [
  { key: "creator-discovery", label: "Discovery", href: MARKET_INTEL_ROUTES.creatorDiscovery },
  { key: "markets", label: "Markets", href: MARKET_INTEL_ROUTES.markets },
  { key: "action-items", label: "Action Items", href: MARKET_INTEL_ROUTES.actionItems },
];

export function MarketIntelWorkflowNav() {
  const pathname = usePathname();
  const active = resolveMarketIntelSection(pathname);

  return (
    <nav
      aria-label="Market Intel workflow"
      className="flex w-full max-w-lg rounded-lg border border-stone-200 bg-stone-100 p-1"
    >
      {SECTIONS.map(({ key, label, href }) => {
        const isActive = key === active;
        return (
          <Link
            key={key}
            href={href}
            className={[
              "flex-1 rounded-md px-4 py-2 text-center text-sm font-semibold no-underline transition-colors sm:flex-none sm:px-5",
              isActive
                ? "bg-stone-900 text-white shadow-sm"
                : "border border-stone-300 bg-white text-stone-600 hover:border-stone-400 hover:text-stone-900",
            ].join(" ")}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** @deprecated Use MarketIntelWorkflowNav — kept for gradual migration */
export const MarketIntelNav = MarketIntelWorkflowNav;
