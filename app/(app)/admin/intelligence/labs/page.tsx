"use client";
// app/(app)/admin/intelligence/labs/page.tsx
// Labs — experimental intelligence tools and R&D scratchpad.
// Placeholder shell.

import { IntelligenceMarketNav } from "@/components/admin/IntelligenceMarketNav";

export default function IntelligenceLabsPage() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 60px" }}>
      <IntelligenceMarketNav />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
          Intelligence Labs
        </h1>
        <p style={{ fontSize: 12, color: "#78716c", margin: 0, maxWidth: 540, lineHeight: 1.55 }}>
          Experimental tools, prototypes, and R&D scratchpad for new
          intelligence verticals and data source integrations.
        </p>
      </div>

      <div style={{
        background: "#fff",
        border: "1px dashed #d6d3d1",
        borderRadius: 14,
        padding: "56px 24px",
        textAlign: "center",
        color: "#a8a29e",
        maxWidth: 480,
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🧪</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#57534e", marginBottom: 6 }}>
          Labs — Experimental
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.6 }}>
          New vertical prototypes and intelligence tooling experiments live here
          before graduating to a named vertical.
        </div>
      </div>
    </div>
  );
}
