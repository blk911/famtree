"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { appendVmbAnalysisQuery } from "@/lib/vmb/trial-scope";
import { VMB_THEME } from "@/lib/vmb/theme";
import { useVmbActiveAnalysis } from "@/components/vmb/useVmbActiveAnalysis";

const NAV_ITEMS = [
  { href: "/vmb/dashboard", label: "Home" },
  { href: "/vmb/clients", label: "Client Book" },
  { href: "/vmb/network", label: "Network" },
  { href: "/vmb/history", label: "History" },
] as const;

const SHELL_MAX = 840;

type Props = {
  children: ReactNode;
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
          background: "rgba(250, 248, 245, 0.94)",
          backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${VMB_THEME.line}`,
        }}
      >
        <div
          style={{
            maxWidth: SHELL_MAX,
            margin: "0 auto",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20, minWidth: 0, flexWrap: "wrap" }}>
            <Link
              href="/vmb"
              style={{
                textDecoration: "none",
                color: VMB_THEME.ink,
                fontSize: 17,
                fontWeight: 800,
                letterSpacing: "-0.03em",
              }}
            >
              VMB
            </Link>
            {shellVariant === "app" ? (
              <nav style={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }} aria-label="VMB">
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
                        color: active ? VMB_THEME.ink : VMB_THEME.muted,
                        padding: "6px 10px",
                      }}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            ) : null}
          </div>

          {shellVariant === "marketing" ? (
            <Link
              href={vmbHref("/vmb/dashboard")}
              style={{ fontSize: 14, fontWeight: 600, color: VMB_THEME.muted, textDecoration: "none" }}
            >
              Home
            </Link>
          ) : (
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: VMB_THEME.muted,
                opacity: 0.55,
              }}
              title="Coming soon"
            >
              Profile
            </span>
          )}
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
