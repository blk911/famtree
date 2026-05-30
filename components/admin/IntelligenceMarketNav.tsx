"use client";
// components/admin/IntelligenceMarketNav.tsx
// Top-level vertical selector for Admin Intelligence tools.
// Renders: Salon / Client-Centric | Transpo | HCare | Labs
// Active state is derived from pathname — no props required.

import Link from "next/link";
import { usePathname } from "next/navigation";

const VERTICALS = [
  { key: "salon",  label: "Salon / Client-Centric", href: "/admin/intelligence/salon" },
  { key: "transpo", label: "Transpo",               href: "/admin/intelligence/transpo" },
  { key: "hcare",  label: "HCare",                  href: "/admin/intelligence/hcare" },
  { key: "labs",   label: "Labs",                   href: "/admin/intelligence/labs" },
] as const;

function resolveActiveVertical(pathname: string): string {
  if (pathname.startsWith("/admin/intelligence/transpo")) return "transpo";
  if (pathname.startsWith("/admin/intelligence/hcare"))   return "hcare";
  if (pathname.startsWith("/admin/intelligence/labs"))    return "labs";
  // All existing /admin/studios/* paths belong to the Salon vertical
  if (
    pathname.startsWith("/admin/studios") ||
    pathname.startsWith("/admin/intelligence/salon")
  ) return "salon";
  return "";
}

export function IntelligenceMarketNav() {
  const pathname = usePathname();
  const active = resolveActiveVertical(pathname);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      marginBottom: 10,
      paddingBottom: 10,
      borderBottom: "1px solid #ede9e4",
    }}>
      {/* Icon / brand anchor */}
      <Link
        href="/admin/studios"
        title="Intelligence Home"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: 8,
          background: "#1c1917",
          color: "#fff",
          fontSize: 13,
          fontWeight: 900,
          textDecoration: "none",
          flexShrink: 0,
          marginRight: 4,
          letterSpacing: "-0.5px",
        }}
      >
        AI
      </Link>

      {/* Vertical pills */}
      {VERTICALS.map(({ key, label, href }) => {
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
