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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 10,
        paddingBottom: 10,
        borderBottom: "1px solid #ede9e4",
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: "#78716c",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginRight: 4,
        }}
      >
        Market Intel
      </span>

      {SECTIONS.map(({ key, label, href }) => {
        const isActive = key === active;
        return (
          <Link
            key={key}
            href={href}
            style={{
              fontSize: 11,
              fontWeight: isActive ? 800 : 500,
              color: isActive ? "#fff" : "#78716c",
              background: isActive ? "#1c1917" : "transparent",
              border: isActive ? "1px solid #1c1917" : "1px solid #e7e5e4",
              borderRadius: 20,
              padding: "4px 12px",
              textDecoration: "none",
              whiteSpace: "nowrap",
              letterSpacing: "0.01em",
              transition: "all 0.12s",
            }}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
