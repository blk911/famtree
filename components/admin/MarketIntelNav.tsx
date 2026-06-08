"use client";
// components/admin/MarketIntelNav.tsx
// Market Intel workflow: Creator Discovery → Markets → Action Items

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MARKET_INTEL_ROUTES,
  resolveMarketIntelSection,
  type MarketIntelSection,
} from "@/lib/markets/market-intel-routes";

const SECTIONS: Array<{ key: MarketIntelSection; label: string; href: string }> = [
  { key: "creator-discovery", label: "Creator Discovery", href: MARKET_INTEL_ROUTES.creatorDiscovery },
  { key: "markets", label: "Markets", href: MARKET_INTEL_ROUTES.markets },
  { key: "action-items", label: "Action Items", href: MARKET_INTEL_ROUTES.actionItems },
];

export function MarketIntelNav() {
  const pathname = usePathname();
  const active = resolveMarketIntelSection(pathname);

  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5 border-b border-stone-200 pb-2">
      <span className="mr-1 text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
        Market Intel
      </span>

      {SECTIONS.map(({ key, label, href }) => {
        const isActive = key === active;
        return (
          <Link
            key={key}
            href={href}
            className={[
              "inline-flex h-7 items-center rounded-full px-3 text-[11px] font-semibold no-underline whitespace-nowrap transition-colors",
              isActive
                ? "bg-stone-900 text-white"
                : "border border-stone-200 bg-transparent text-stone-600 hover:border-stone-300",
            ].join(" ")}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
