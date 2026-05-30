"use client";
// app/(app)/admin/intelligence/transpo/resolver/page.tsx
// Carrier Resolver — resolve carrier names / USDOT records to public websites,
// Google, LinkedIn, job posts, and other identity signals.
// Placeholder shell — integration TBD.

import { IntelligenceMarketNav } from "@/components/admin/IntelligenceMarketNav";
import { IntelligenceSubNav } from "@/components/admin/IntelligenceSubNav";
import { transpoConfig } from "@/lib/intelligence/verticals/transpo.config";

export default function TranspoResolverPage() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 60px" }}>
      <IntelligenceMarketNav />
      <IntelligenceSubNav config={transpoConfig} currentTool="resolver" />

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
          Carrier Resolver
        </h1>
        <p style={{ fontSize: 12, color: "#78716c", margin: 0, maxWidth: 620, lineHeight: 1.55 }}>
          Resolve carrier names and USDOT records to public websites, Google presence,
          LinkedIn profiles, job posts, and other identity signals. Feeds the Red Dots
          pipeline with verified carrier data.
        </p>
      </div>

      {/* Placeholder */}
      <div style={{
        background: "#fff",
        border: "1px dashed #d6d3d1",
        borderRadius: 14,
        padding: "48px 24px",
        textAlign: "center",
        color: "#a8a29e",
        maxWidth: 560,
      }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>🚛</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#57534e", marginBottom: 6 }}>
          Carrier Resolver — Coming Soon
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.6 }}>
          Will resolve USDOT / MC numbers and carrier names to public
          identity signals across FMCSA, SAFER, Google, LinkedIn, and
          carrier websites. Start by creating a Source Run.
        </div>
      </div>

      {/* Sources this vertical uses */}
      <div style={{ marginTop: 28, maxWidth: 560 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#78716c", marginBottom: 10, letterSpacing: "0.06em" }}>
          ENABLED SOURCES FOR THIS VERTICAL
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {transpoConfig.allowedPlatforms.map((p) => (
            <span key={p} style={{
              fontSize: 11, fontWeight: 600, padding: "3px 10px",
              background: "#f0fdf4", color: "#15803d",
              border: "1px solid #bbf7d0", borderRadius: 20,
            }}>
              {transpoConfig.sourceLabels[p] ?? p}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
