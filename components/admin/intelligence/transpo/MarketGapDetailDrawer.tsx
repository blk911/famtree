"use client";

import type { ReactNode } from "react";
import type { TranspoMarketGapRecord } from "@/lib/intelligence/transpo/market-gaps/types";
import { SERVICE_CATEGORY_LABELS } from "@/lib/intelligence/transpo/market-gaps/types";

type Props = {
  record: TranspoMarketGapRecord | null;
  open: boolean;
  onClose: () => void;
};

const SEVERITY_STYLE: Record<string, { fg: string; bg: string; bd: string }> = {
  critical: { fg: "#991b1b", bg: "#fef2f2", bd: "#fecaca" },
  high: { fg: "#9a3412", bg: "#ffedd5", bd: "#fed7aa" },
  medium: { fg: "#92400e", bg: "#fef3c7", bd: "#fde68a" },
  low: { fg: "#166534", bg: "#dcfce7", bd: "#bbf7d0" },
};

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8, fontSize: 12, marginBottom: 8 }}>
      <span style={{ color: "#a8a29e", fontWeight: 700 }}>{label}</span>
      <span style={{ color: "#44403c" }}>{value}</span>
    </div>
  );
}

export function MarketGapDetailDrawer({ record, open, onClose }: Props) {
  if (!open || !record) return null;

  const sev = SEVERITY_STYLE[record.severity] ?? SEVERITY_STYLE.low;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 440,
        background: "rgba(28,25,23,0.45)",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(480px, 100vw)",
          height: "100%",
          background: "#fff",
          borderLeft: "1px solid #e7e5e4",
          overflow: "auto",
          padding: "20px 22px 40px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1c1917", margin: "0 0 4px" }}>{record.marketLabel}</h2>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
              color: sev.fg, background: sev.bg, border: `1px solid ${sev.bd}`,
            }}>
              {record.severity.toUpperCase()} · Gap {record.gapScore}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #e7e5e4", background: "#fafaf9", borderRadius: 8,
              width: 32, height: 32, cursor: "pointer", fontSize: 18, lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <Row label="Service" value={SERVICE_CATEGORY_LABELS[record.serviceCategory]} />
        <Row label="Carriers" value={record.carrierCount} />
        <Row label="Active authority" value={record.activeAuthorityCount} />
        <Row label="Verified" value={record.verifiedCarrierCount} />
        <Row label="Fleet total" value={record.fleetCount ?? "—"} />
        <Row label="Drivers total" value={record.driverCount ?? "—"} />
        <Row label="Supply score" value={record.supplyScore} />
        <Row label="Demand score" value={record.demandScore} />
        <Row label="Rurality" value={record.demandSignals.rurality ?? "unknown"} />

        <div style={{ marginTop: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 8 }}>
            REASONS
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#57534e", lineHeight: 1.55 }}>
            {record.reasons.map((r) => (
              <li key={r} style={{ marginBottom: 4 }}>{r}</li>
            ))}
          </ul>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 8 }}>
            RECOMMENDED PLAY
          </div>
          <p style={{ fontSize: 13, color: "#1c1917", margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
            {record.recommendedPlay}
          </p>
        </div>

        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", letterSpacing: "0.08em", marginBottom: 8 }}>
            EVIDENCE
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#57534e", lineHeight: 1.55 }}>
            {record.evidence.map((e) => (
              <li key={e} style={{ marginBottom: 4 }}>{e}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
