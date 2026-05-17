// AIH Safe — page shell wrapper. Server-compatible (no "use client").
// Provides the hero header and consistent page container.

import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export function AihSafeShell({ children }: Props) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 20px 96px" }}>

      {/* Hero */}
      <div style={{ marginBottom: 36 }}>
        <p
          style={{
            fontSize:      12,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color:         "#a8a29e",
            fontWeight:    600,
            marginBottom:  10,
          }}
        >
          Msg Vault
        </p>
        <h1
          style={{
            fontSize:    30,
            fontWeight:  700,
            color:       "#1c1917",
            marginBottom: 10,
            lineHeight:  1.15,
          }}
        >
          Your family's healthy internet.
        </h1>
        <p style={{ fontSize: 15, color: "#57534e", maxWidth: 500, lineHeight: 1.6 }}>
          Every space here is governed — your family decides who sees what, together.
          No open discovery. No vanity metrics. Just people you trust.
        </p>
      </div>

      {children}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

interface SectionProps {
  title:    string;
  subtitle: string;
  children: ReactNode;
}

export function AihSection({ title, subtitle, children }: SectionProps) {
  return (
    <div
      style={{
        background:   "#fff",
        borderRadius: 20,
        padding:      "28px 28px",
        boxShadow:    "0 1px 4px rgba(0,0,0,0.05)",
        border:       "1px solid #e7e5e4",
        marginBottom: 20,
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1c1917", marginBottom: 4 }}>
          {title}
        </h2>
        <p style={{ fontSize: 13, color: "#78716c" }}>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
