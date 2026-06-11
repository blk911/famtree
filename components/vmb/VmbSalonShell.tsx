"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { VmbSummaryRail } from "@/components/vmb/VmbSummaryRail";
import { useVmbActiveAnalysis } from "@/components/vmb/useVmbActiveAnalysis";
import { VMB_SALON_MOBILE_NAV_IDS, VMB_SALON_NAV } from "@/lib/vmb/salon-nav";
import { buildVmbSalonNavHref } from "@/lib/vmb/salon-nav-href";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbSalonWorkspace } from "@/types/vmb/workspace";

type Props = {
  children: ReactNode;
};

export function VmbSalonShell({ children }: Props) {
  const pathname = usePathname();
  const activeAnalysisId = useVmbActiveAnalysis();
  const [railOpen, setRailOpen] = useState(false);
  const [salonName, setSalonName] = useState("Your Salon");

  useEffect(() => {
    setRailOpen(false);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    async function loadSalon() {
      try {
        const res = await fetch("/api/vmb/workspace", { cache: "no-store", credentials: "include" });
        const json = (await res.json()) as { ok: boolean; data?: VmbSalonWorkspace | null };
        if (!cancelled && json.ok && json.data?.salonName?.trim()) {
          setSalonName(json.data.salonName.trim());
        }
      } catch {
        // keep default
      }
    }
    void loadSalon();
    return () => {
      cancelled = true;
    };
  }, []);

  function isActive(href: string): boolean {
    const path = href.split("?")[0];
    return pathname === path || pathname.startsWith(`${path}/`);
  }

  const mobileNav = VMB_SALON_NAV.filter((item) =>
    (VMB_SALON_MOBILE_NAV_IDS as readonly string[]).includes(item.id),
  );

  return (
    <div
      className="vmb-salon-shell"
      style={{
        minHeight: "100vh",
        background: VMB_THEME.warmBg,
        color: VMB_THEME.ink,
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      {railOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="vmb-salon-rail-backdrop"
          onClick={() => setRailOpen(false)}
        />
      ) : null}

      <aside className={`vmb-salon-rail${railOpen ? " vmb-salon-rail--open" : ""}`} aria-label="Salon menu">
        <div style={{ padding: "20px 18px 12px" }}>
          <Link
            href="/vmb"
            style={{
              textDecoration: "none",
              color: VMB_THEME.ink,
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            VMB
          </Link>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: VMB_THEME.muted, lineHeight: 1.35 }}>
            {salonName}
          </p>
        </div>
        <nav style={{ display: "grid", gap: 2, padding: "8px 10px 20px" }}>
          {VMB_SALON_NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.id}
                href={buildVmbSalonNavHref(item, activeAnalysisId)}
                style={{
                  display: "block",
                  padding: "10px 12px",
                  borderRadius: 10,
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  color: active ? VMB_THEME.ink : VMB_THEME.muted,
                  background: active ? VMB_THEME.accentSoft : "transparent",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="vmb-salon-main">
        <header
          className="vmb-salon-topbar"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 30,
            background: "rgba(250, 248, 245, 0.94)",
            backdropFilter: "blur(10px)",
            borderBottom: `1px solid ${VMB_THEME.line}`,
          }}
        >
          <div className="vmb-salon-topbar-inner">
            <button
              type="button"
              className="vmb-salon-menu-btn"
              aria-label="Open salon menu"
              onClick={() => setRailOpen(true)}
            >
              Menu
            </button>
            <div style={{ minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em" }}>VMB</span>
              <span
                style={{
                  display: "block",
                  fontSize: 13,
                  color: VMB_THEME.muted,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {salonName}
              </span>
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: VMB_THEME.muted,
                opacity: 0.55,
                flexShrink: 0,
              }}
              title="Coming soon"
            >
              Profile
            </span>
          </div>
        </header>

        <div className="vmb-salon-content-row">
          <main className="vmb-salon-content">{children}</main>
          <VmbSummaryRail />
        </div>

        <nav className="vmb-salon-mobile-nav" aria-label="Quick salon navigation">
          {mobileNav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.id}
                href={buildVmbSalonNavHref(item, activeAnalysisId)}
                style={{
                  textDecoration: "none",
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  color: active ? VMB_THEME.accent : VMB_THEME.muted,
                  textAlign: "center",
                  padding: "8px 4px",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
