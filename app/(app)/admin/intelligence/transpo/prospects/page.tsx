"use client";
// app/(app)/admin/intelligence/transpo/prospects/page.tsx
// Carrier Prospects / Red Dots — qualified carrier targets discovered
// via the Transpo intelligence pipeline.

import { useState, useEffect } from "react";
import { TranspoIntelligenceNav } from "@/components/admin/intelligence/transpo/TranspoIntelligenceNav";
import { transpoConfig } from "@/lib/intelligence/verticals/transpo.config";
import type { BaseProspect } from "@/lib/intelligence/core/prospect-types";

// ─── Placeholder data ─────────────────────────────────────────────────────────

const PLACEHOLDER_RECORDS: BaseProspect[] = [
  {
    prospectId: "demo-001",
    verticalKey: "transpo",
    entityLabel: "Carrier",
    prospectLabel: "Red Dot",
    name: "Rocky Mountain Freight LLC",
    location: "Denver, CO",
    status: "new",
    opportunityScore: 72,
    notes: "Placeholder — no real data yet",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    prospectId: "demo-002",
    verticalKey: "transpo",
    entityLabel: "Carrier",
    prospectLabel: "Red Dot",
    name: "High Plains Transport Inc",
    location: "Colorado Springs, CO",
    status: "new",
    opportunityScore: 58,
    notes: "Placeholder — no real data yet",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function scoreColor(n: number) {
  if (n >= 65) return "#16a34a";
  if (n >= 40) return "#d97706";
  return "#dc2626";
}

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  qualified: "Qualified",
  disqualified: "Disqualified",
  contacted: "Contacted",
  archive: "Archive",
};

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  new:          { bg: "#f5f5f4", fg: "#57534e" },
  qualified:    { bg: "#f0fdf4", fg: "#15803d" },
  disqualified: { bg: "#fef2f2", fg: "#dc2626" },
  contacted:    { bg: "#eff6ff", fg: "#1d4ed8" },
  archive:      { bg: "#fafaf9", fg: "#a8a29e" },
};

const thS: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  fontSize: 10,
  fontWeight: 800,
  color: "#a8a29e",
  letterSpacing: "0.08em",
  borderBottom: "1px solid #f0ede8",
  background: "#fafaf9",
  whiteSpace: "nowrap",
};

const tdS: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 12,
  color: "#57534e",
  borderBottom: "1px solid #f5f4f2",
  verticalAlign: "middle",
};

export default function TranspoProspectsPage() {
  const [isPlaceholder] = useState(true);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 60px" }}>
      <TranspoIntelligenceNav currentTool="prospects" />

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>
          Carrier Prospects / Red Dots
        </h1>
        <p style={{ fontSize: 12, color: "#78716c", margin: 0, maxWidth: 620, lineHeight: 1.55 }}>
          Carriers and operators surfaced by the Transpo intelligence pipeline.
          Each Red Dot represents a qualified carrier target with verified
          identity signals and opportunity scoring.
        </p>
      </div>

      {/* Placeholder banner */}
      {isPlaceholder && (
        <div style={{
          marginBottom: 16,
          padding: "10px 14px",
          background: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: 8,
          fontSize: 12,
          color: "#92400e",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span>⚠️</span>
          <span>
            <strong>Placeholder records.</strong> Run a Source Ingest → Resolver → Harvest
            cycle to populate real carrier data.
          </span>
        </div>
      )}

      {/* Stats row */}
      <div style={{
        display: "flex",
        gap: 10,
        marginBottom: 16,
        flexWrap: "wrap",
      }}>
        {[
          { label: "Red Dots", val: PLACEHOLDER_RECORDS.length, color: "#1c1917" },
          { label: "Qualified", val: PLACEHOLDER_RECORDS.filter(r => r.status === "qualified").length, color: "#15803d" },
          { label: "Avg Score", val: Math.round(PLACEHOLDER_RECORDS.reduce((s, r) => s + (r.opportunityScore ?? 0), 0) / PLACEHOLDER_RECORDS.length), color: "#9d174d" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{
            background: "#fff", border: "1px solid #e7e5e4",
            borderRadius: 10, padding: "10px 14px", minWidth: 90,
          }}>
            <div style={{ fontSize: 22, fontWeight: 850, color }}>{val}</div>
            <div style={{ fontSize: 9, color: "#a8a29e", fontWeight: 800, letterSpacing: "0.04em" }}>
              {label.toUpperCase()}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 14, overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 700, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Carrier Name", "Location", "Opp. Score", "Status", "Notes"].map((h) => (
                <th key={h} style={thS}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLACEHOLDER_RECORDS.map((r) => {
              const sc = STATUS_COLORS[r.status] ?? { bg: "#f5f5f4", fg: "#57534e" };
              return (
                <tr key={r.prospectId} style={{ opacity: isPlaceholder ? 0.7 : 1 }}>
                  <td style={{ ...tdS, fontWeight: 700, color: "#1c1917" }}>
                    {r.name ?? "—"}
                    <span style={{
                      marginLeft: 7, fontSize: 9, fontWeight: 700,
                      background: "#f0fdf4", color: "#15803d",
                      border: "1px solid #bbf7d0", borderRadius: 20, padding: "1px 7px",
                    }}>
                      {r.entityLabel}
                    </span>
                  </td>
                  <td style={tdS}>{r.location ?? "—"}</td>
                  <td style={tdS}>
                    <span style={{
                      fontWeight: 800, fontSize: 14,
                      color: scoreColor(r.opportunityScore ?? 0),
                    }}>
                      {r.opportunityScore ?? "—"}
                    </span>
                  </td>
                  <td style={tdS}>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      background: sc.bg, color: sc.fg,
                      borderRadius: 20, padding: "2px 8px",
                      whiteSpace: "nowrap",
                    }}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>
                  <td style={{ ...tdS, color: "#a8a29e", fontStyle: "italic", fontSize: 11 }}>
                    {r.notes ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
