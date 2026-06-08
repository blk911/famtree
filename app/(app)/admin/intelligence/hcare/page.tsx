"use client";
// app/(app)/admin/intelligence/hcare/page.tsx
// HCare vertical — Healthcare practices, clinics, allied health operators.
// Placeholder shell — tools and integrations TBD.

import { MarketIntelChrome } from "@/components/admin/MarketIntelChrome";
import { MarketIntelPageShell } from "@/components/admin/MarketIntelPageShell";
import { IntelligenceContextBadge } from "@/components/admin/IntelligenceContextBadge";
import { hcareConfig } from "@/lib/intelligence/verticals/hcare.config";

export default function HCareIntelligencePage() {
  return (
    <MarketIntelPageShell>
      <MarketIntelChrome />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
          HCare Intelligence
        </h1>
        <p style={{ fontSize: 12, color: "#78716c", margin: 0, maxWidth: 540, lineHeight: 1.55 }}>
          Healthcare practice and allied health operator intelligence pipeline.
          Tools and data sources for this vertical are under development.
        </p>
        <IntelligenceContextBadge
          verticalLabel={hcareConfig.label}
          dataScope={hcareConfig.dataScope}
        />
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
        <div style={{ fontSize: 32, marginBottom: 12 }}>🏥</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#57534e", marginBottom: 6 }}>
          HCare — Coming Soon
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.6 }}>
          Vertical key: <code style={{ fontSize: 11, background: "#f5f4f2", padding: "1px 5px", borderRadius: 4 }}>{hcareConfig.verticalKey}</code>
          &nbsp;·&nbsp;Entity: <strong>{hcareConfig.entityLabel}</strong>
          &nbsp;·&nbsp;Prospect: <strong>{hcareConfig.prospectLabel}</strong>
        </div>
      </div>
    </MarketIntelPageShell>
  );
}
