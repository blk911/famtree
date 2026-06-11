"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { VMB_THEME } from "@/lib/vmb/theme";

/** Minimal chrome for /vmb/start ingest — no left rail. */
export function VmbStartShell({ children }: { children: ReactNode }) {
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
          borderBottom: `1px solid ${VMB_THEME.line}`,
          background: "rgba(250, 248, 245, 0.96)",
        }}
      >
        <div
          className="vmb-start-shell-header"
          style={{
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/vmb"
            style={{
              textDecoration: "none",
              color: VMB_THEME.ink,
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            VMB
          </Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
