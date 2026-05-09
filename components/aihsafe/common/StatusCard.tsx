"use client";
// AIH Safe — foundation status cards.
// Fetches counts on mount and shows them as warm stat tiles.

import { useEffect, useState } from "react";
import { listFamilyUnits, listTrustUnits, listApprovals } from "./apiClient";

// ─── Single stat tile ─────────────────────────────────────────────────────────

interface CardProps {
  label:   string;
  value:   string | number;
  sub:     string;
  accent?: string; // left-border accent colour when non-null
}

export function StatusCard({ label, value, sub, accent }: CardProps) {
  return (
    <div
      style={{
        background:  "#fff",
        borderRadius: 16,
        padding:     "20px 22px",
        boxShadow:   "0 1px 4px rgba(0,0,0,0.05)",
        border:      "1px solid #e7e5e4",
        borderLeft:  accent ? `4px solid ${accent}` : "1px solid #e7e5e4",
      }}
    >
      <div
        style={{
          fontSize:      11,
          color:         "#a8a29e",
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          marginBottom:  8,
          fontWeight:    600,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 34, fontWeight: 700, color: "#1c1917", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "#78716c", marginTop: 6 }}>{sub}</div>
    </div>
  );
}

// ─── Composite dashboard row ──────────────────────────────────────────────────

export function StatusDashboard() {
  const [families,  setFamilies]  = useState<number | null>(null);
  const [units,     setUnits]     = useState<number | null>(null);
  const [approvals, setApprovals] = useState<number | null>(null);

  useEffect(() => {
    listFamilyUnits().then(r  => { if (r.kind === "ok") setFamilies(r.data.items.length); });
    listTrustUnits().then(r   => { if (r.kind === "ok") setUnits(r.data.items.length); });
    listApprovals("pending").then(r => { if (r.kind === "ok") setApprovals(r.data.items.length); });
  }, []);

  const fmt = (n: number | null) => (n === null ? "—" : String(n));
  const hasApprovals = approvals !== null && approvals > 0;

  return (
    <div
      style={{
        display:             "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap:                 12,
        marginBottom:        36,
      }}
    >
      <StatusCard
        label="Family groups"
        value={fmt(families)}
        sub="Your real people"
      />
      <StatusCard
        label="Trusted spaces"
        value={fmt(units)}
        sub="Teams, pods, circles"
      />
      <StatusCard
        label="Awaiting approval"
        value={fmt(approvals)}
        sub="In your guardian inbox"
        accent={hasApprovals ? "#d97706" : undefined}
      />
    </div>
  );
}
