"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { appendVmbAnalysisQuery } from "@/lib/vmb/trial-scope";
import { VMB_THEME } from "@/lib/vmb/theme";
import { useVmbActiveAnalysis } from "@/components/vmb/useVmbActiveAnalysis";

const NAV_ITEMS = [
  { href: "/vmb/dashboard", label: "This Week" },
  { href: "/vmb/clients", label: "Clients" },
  { href: "/vmb/network", label: "Network" },
  { href: "/vmb/opportunities", label: "Opportunities" },
  { href: "/vmb/campaigns", label: "Campaigns" },
  { href: "/vmb/revenue", label: "Revenue" },
] as const;

type Props = {
  children: ReactNode;
  /** Landing uses a lighter nav without app chrome emphasis */
  variant?: "marketing" | "app";
};

export function VmbShell({ children, variant = "app" }: Props) {
  const pathname = usePathname();
  const activeAnalysisId = useVmbActiveAnalysis();
  const isLanding = pathname === "/vmb";
  const shellVariant = isLanding ? "marketing" : variant;

  function vmbHref(href: string): string {
    return appendVmbAnalysisQuery(href, activeAnalysisId);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: VMB_THEME.warmBg,
        color: VMB_THEME.ink,
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "rgba(250, 248, 245, 0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${VMB_THEME.line}`,
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "18px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 32, minWidth: 0 }}>
            <Link
              href="/vmb"
              style={{
                textDecoration: "none",
                color: VMB_THEME.ink,
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                whiteSpace: "nowrap",
              }}
            >
              VMB
            </Link>
            {shellVariant === "app" ? (
              <nav
                className="hidden md:flex"
                style={{ alignItems: "center", gap: 4 }}
                aria-label="VMB primary"
              >
                {NAV_ITEMS.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={vmbHref(item.href)}
                      style={{
                        textDecoration: "none",
                        fontSize: 14,
                        fontWeight: active ? 700 : 500,
                        color: active ? VMB_THEME.accent : VMB_THEME.muted,
                        padding: "8px 12px",
                        borderRadius: 10,
                        background: active ? VMB_THEME.accentSoft : "transparent",
                      }}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            ) : null}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
            {shellVariant === "marketing" ? (
              <Link
                href={vmbHref("/vmb/dashboard")}
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: VMB_THEME.muted,
                  textDecoration: "none",
                }}
              >
                This Week
              </Link>
            ) : (
              <>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: VMB_THEME.muted,
                    opacity: 0.55,
                    cursor: "not-allowed",
                  }}
                  aria-disabled="true"
                  title="Coming soon"
                >
                  Profile
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: VMB_THEME.muted,
                    opacity: 0.55,
                    cursor: "not-allowed",
                  }}
                  aria-disabled="true"
                  title="Coming soon"
                >
                  Settings
                </span>
              </>
            )}
          </div>
        </div>

        {shellVariant === "app" ? (
          <nav
            className="flex md:hidden overflow-x-auto"
            style={{
              gap: 4,
              padding: "0 24px 12px",
              borderTop: `1px solid ${VMB_THEME.line}`,
              paddingTop: 12,
            }}
            aria-label="VMB mobile"
          >
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={vmbHref(item.href)}
                  style={{
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    color: active ? VMB_THEME.accent : VMB_THEME.muted,
                    padding: "6px 10px",
                    borderRadius: 8,
                    whiteSpace: "nowrap",
                    background: active ? VMB_THEME.accentSoft : "transparent",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </header>

      <main>{children}</main>
    </div>
  );
}
