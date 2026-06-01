"use client";
// app/(app)/admin/studios/runs/page.tsx
// Run history and audit trail — placeholder. Not yet built.

import { CreatorIntelligenceNav } from "@/components/studios/creator-lab/CreatorIntelligenceNav";
import { IntelligenceFeatureHeader } from "@/components/admin/IntelligenceFeatureHeader";
import { salonConfig } from "@/lib/intelligence/verticals/salon.config";

export default function RunsPage() {
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px 60px" }}>

      <CreatorIntelligenceNav current="runs" />

      <IntelligenceFeatureHeader
        title="Runs"
        description="Run history and audit trail for salon hashtag harvest, IG resolver, and prospect upserts — coming soon."
        config={salonConfig}
      />

      <div style={{
        background: "#fff",
        border: "1px solid #e7e5e4",
        borderRadius: 14,
        padding: "40px 28px",
        textAlign: "center",
        color: "#a8a29e",
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🗂️</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#78716c", marginBottom: 6 }}>
          Run history and audit trail coming soon.
        </div>
        <div style={{ fontSize: 13, color: "#a8a29e", maxWidth: 400, margin: "0 auto" }}>
          This will show a chronological log of all Hashtag Harvest runs, IG Resolver batches,
          and prospect upserts — with per-run summaries and re-run capability.
        </div>
      </div>

    </div>
  );
}
