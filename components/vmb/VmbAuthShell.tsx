"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { VMB_THEME } from "@/lib/vmb/theme";

type Props = {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
};

export function VmbAuthShell({
  children,
  backHref = "/vmb",
  backLabel = "Back to VMB",
}: Props) {
  return (
    <div
      className="vmb-auth-shell"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundImage: "url('/uploads/index-bg3.webp')",
        backgroundSize: "cover",
        backgroundPosition: "center center",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(160deg,rgba(28,25,23,0.72) 0%,rgba(157,23,77,0.35) 45%,rgba(28,25,23,0.78) 100%)",
          zIndex: 0,
        }}
      />

      <nav
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <Link
          href="/vmb"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: VMB_THEME.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 16,
              fontWeight: 900,
            }}
          >
            V
          </div>
          <span
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: "white",
              letterSpacing: "-0.3px",
            }}
          >
            VMB for Salons
          </span>
        </Link>
      </nav>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 460,
            background: "rgba(255,255,255,0.98)",
            borderRadius: 22,
            boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
            backdropFilter: "blur(12px)",
            padding: "36px 40px",
          }}
        >
          <Link
            href={backHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: VMB_THEME.muted,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              marginBottom: 18,
            }}
          >
            {backLabel}
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
