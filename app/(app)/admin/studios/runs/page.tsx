"use client";
// app/(app)/admin/studios/runs/page.tsx
// Run history and audit trail — placeholder. Not yet built.

import { CreatorIntelligenceNav } from "@/components/studios/creator-lab/CreatorIntelligenceNav";

export default function RunsPage() {
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px 60px" }}>

      <CreatorIntelligenceNav current="runs" />

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1c1917", margin: "0 0 6px" }}>
          Runs
        </h1>
        <p style={{ fontSize: 13, color: "#78716c", margin: 0 }}>
          Run history and audit trail — coming soon.
        </p>
      </div>

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
