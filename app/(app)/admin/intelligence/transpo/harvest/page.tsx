"use client";
// app/(app)/admin/intelligence/transpo/harvest/page.tsx
// Transpo Market Harvest — market-level discovery and aggregation for
// carrier / operator signals. Placeholder shell.

import { IntelligenceMarketNav } from "@/components/admin/IntelligenceMarketNav";
import { IntelligenceSubNav } from "@/components/admin/IntelligenceSubNav";
import { transpoConfig } from "@/lib/intelligence/verticals/transpo.config";

const SCHEMA_HINTS = transpoConfig.schemaHints;
const SCORING_HINTS = transpoConfig.scoringHints;

export default function TranspoHarvestPage() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 60px" }}>
      <IntelligenceMarketNav />
      <IntelligenceSubNav config={transpoConfig} currentTool="harvest" />

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
          Transpo Market Harvest
        </h1>
        <p style={{ fontSize: 12, color: "#78716c", margin: 0, maxWidth: 640, lineHeight: 1.55 }}>
          Market-level discovery and aggregation for carrier and operator signals.
          Harvest carrier presence data across public sources and surface
          high-signal targets for the Red Dots pipeline.
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
        marginBottom: 28,
      }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>📡</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#57534e", marginBottom: 6 }}>
          Market Harvest — Coming Soon
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.6 }}>
          Will aggregate carrier market signals from DOT / FMCSA public data,
          fleet hiring posts, and website signals. No salon or personal-care
          sources are used in this vertical.
        </div>
      </div>

      {/* Schema hints */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 700 }}>
        <div style={{
          background: "#fff", border: "1px solid #e7e5e4",
          borderRadius: 10, padding: "14px 16px",
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 10 }}>
            CARRIER SCHEMA FIELDS
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {SCHEMA_HINTS.map((h) => (
              <li key={h} style={{ fontSize: 12, color: "#57534e", padding: "3px 0", borderBottom: "1px solid #f5f4f2" }}>
                {h}
              </li>
            ))}
          </ul>
        </div>
        <div style={{
          background: "#fff", border: "1px solid #e7e5e4",
          borderRadius: 10, padding: "14px 16px",
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 10 }}>
            SCORING SIGNALS
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {SCORING_HINTS.map((h) => (
              <li key={h} style={{ fontSize: 12, color: "#57534e", padding: "3px 0", borderBottom: "1px solid #f5f4f2" }}>
                {h}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
