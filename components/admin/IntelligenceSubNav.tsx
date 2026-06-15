"use client";
// components/admin/IntelligenceSubNav.tsx
// Tool-level subnav for any intelligence vertical.
// Accepts a VerticalConfig and renders active-state pill links.

import Link from "next/link";
import { ADMIN_WORKSPACE_ROUTES } from "@/lib/admin/workspace-routes";
import { usePathname } from "next/navigation";
import { IntelligenceContextBadge } from "@/components/admin/IntelligenceContextBadge";
import type { VerticalConfig } from "@/lib/intelligence/core/vertical-config";

interface Props {
  config: VerticalConfig;
  /** Optional: override which navItem ID is active (uses pathname matching if omitted) */
  currentTool?: string;
  /** Optional slot after tool pills (e.g. Fresh Slate on Salon) */
  trailing?: React.ReactNode;
  /** Show vertical context badge under the tool rail (default true) */
  showContextBadge?: boolean;
}

function resolveCurrentTool(config: VerticalConfig, pathname: string): string {
  // Exact-last-segment match: find the navItem whose href is a prefix of pathname
  const sorted = [...config.navItems].sort((a, b) => b.href.length - a.href.length);
  const match = sorted.find((item) => pathname === item.href || pathname.startsWith(item.href + "/"));
  return match?.id ?? "";
}

export function IntelligenceSubNav({
  config,
  currentTool,
  trailing,
  showContextBadge = true,
}: Props) {
  const pathname = usePathname();
  const active = currentTool ?? resolveCurrentTool(config, pathname);

  return (
    <div style={{ marginBottom: 18 }}>
      {/* Breadcrumb */}
      <div style={{
        fontSize: 11,
        color: "#a8a29e",
        marginBottom: 8,
        display: "flex",
        alignItems: "center",
        gap: 5,
        letterSpacing: "0.01em",
      }}>
        <Link href={ADMIN_WORKSPACE_ROUTES.discovery} style={{ color: "#78716c", textDecoration: "none", fontWeight: 600 }}>
          Discovery
        </Link>
        <span style={{ color: "#d6d3d1", fontSize: 10 }}>›</span>
        <span style={{ color: "#44403c", fontWeight: 700 }}>{config.label}</span>
      </div>

      {/* Tool pill rail */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{
          display: "inline-flex",
          gap: 2,
          flexWrap: "wrap",
          alignItems: "center",
          background: "#f5f4f2",
          border: "1px solid #e7e5e4",
          borderRadius: 10,
          padding: "3px 4px",
        }}>
          {config.navItems.map(({ id, label, href }) => {
            const isActive = id === active;
            return (
              <Link
                key={id}
                href={href}
                style={{
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#1c1917" : "#78716c",
                  background: isActive ? "#ffffff" : "transparent",
                  border: isActive ? "1px solid #e2e0dc" : "1px solid transparent",
                  borderRadius: 7,
                  padding: "4px 11px",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.07)" : "none",
                  lineHeight: "1.5",
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>
        {trailing}
      </div>

      {showContextBadge ? (
        <IntelligenceContextBadge
          verticalLabel={config.label}
          dataScope={config.dataScope}
        />
      ) : null}
    </div>
  );
}
