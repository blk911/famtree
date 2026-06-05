"use client";

import type { ReactNode } from "react";
import { DataSourceStatusBadge } from "@/components/admin/intelligence/transpo/DataSourceStatusBadge";
import type { TranspoServiceDeficitRecord } from "@/lib/intelligence/transpo/service-deficits/deficit-types";
import { SERVICE_CATEGORY_LABELS } from "@/lib/intelligence/transpo/market-gaps/types";

type Props = {
  record: TranspoServiceDeficitRecord | null;
  open: boolean;
  onClose: () => void;
};

const SEV: Record<string, { fg: string; bg: string }> = {
  critical: { fg: "#991b1b", bg: "#fef2f2" },
  high: { fg: "#9a3412", bg: "#ffedd5" },
  medium: { fg: "#92400e", bg: "#fef3c7" },
  low: { fg: "#166534", bg: "#dcfce7" },
};

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 8, fontSize: 12, marginBottom: 8 }}>
      <span style={{ color: "#a8a29e", fontWeight: 700 }}>{label}</span>
      <span style={{ color: "#44403c" }}>{value}</span>
    </div>
  );
}

export function ServiceDeficitDetailDrawer({ record, open, onClose }: Props) {
  if (!open || !record) return null;
  const sev = SEV[record.severity] ?? SEV.low;
  const rev = record.revenueOpportunity;
  const conf = record.dataConfidence;
  const highGapLowConf =
    conf &&
    (conf.confidenceGrade === "low" || conf.confidenceGrade === "experimental") &&
    (record.severity === "high" || record.severity === "critical");

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 440, background: "rgba(28,25,23,0.45)", display: "flex", justifyContent: "flex-end" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(520px, 100vw)", height: "100%", background: "#fff", borderLeft: "1px solid #e7e5e4", overflow: "auto", padding: "20px 22px 40px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>{record.marketLabel}</h2>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: sev.fg, background: sev.bg }}>
              {record.severity.toUpperCase()} · Deficit {record.deficitScore}
            </span>
          </div>
          <button type="button" onClick={onClose} style={{ border: "1px solid #e7e5e4", background: "#fafaf9", borderRadius: 8, width: 32, height: 32, cursor: "pointer" }}>×</button>
        </div>

        <Row label="Service" value={SERVICE_CATEGORY_LABELS[record.serviceCategory]} />
        <Row label="Need score" value={record.needScore} />
        <Row label="Payer presence" value={record.payerPresenceScore} />
        <Row label="Coverage score" value={record.coverageScore} />
        <Row label="Providers" value={record.providerCount} />
        <Row label="Verified" value={record.verifiedProviderCount} />
        <Row label="Fleet capacity" value={record.fleetCapacity} />
        <Row label="Population" value={record.demand.population.toLocaleString()} />
        <Row label="Seniors 65+" value={`${record.demand.seniors65Plus.toLocaleString()} (${record.demand.seniorsPercent}%)`} />
        <Row label="Veterans" value={`${record.demand.veterans.toLocaleString()} (${record.demand.veteransPercent}%)`} />
        <Row label="Rurality" value={record.demand.rurality} />

        {highGapLowConf ? (
          <div style={{ marginTop: 12, fontSize: 12, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 12px", lineHeight: 1.55 }}>
            This market shows a large potential deficit, but the data confidence is low. Validate demand and payer data before action.
          </div>
        ) : null}

        {conf ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", marginBottom: 8 }}>DATA CONFIDENCE</div>
            <Row label="Score" value={`${conf.confidenceScore} (${conf.confidenceGrade})`} />
            <Row label="Carrier supply" value={<DataSourceStatusBadge status={conf.carrierSupplyStatus} />} />
            <Row label="Verification" value={<DataSourceStatusBadge status={conf.verificationStatus} />} />
            <Row label="Demand" value={<DataSourceStatusBadge status={conf.demandStatus} />} />
            <Row label="Payer" value={<DataSourceStatusBadge status={conf.payerStatus} />} />
            <Row label="Revenue" value={<DataSourceStatusBadge status={conf.revenueStatus} />} />
            {conf.liveSignals.length > 0 ? (
              <Row label="Live signals" value={conf.liveSignals.join("; ")} />
            ) : null}
            {conf.seededSignals.length > 0 ? (
              <Row label="Seeded signals" value={conf.seededSignals.join("; ")} />
            ) : null}
            {conf.heuristicSignals.length > 0 ? (
              <Row label="Heuristic signals" value={conf.heuristicSignals.join("; ")} />
            ) : null}
            {conf.missingSignals.length > 0 ? (
              <Row label="Missing signals" value={conf.missingSignals.join("; ")} />
            ) : null}
            {conf.recommendedNextDataSource ? (
              <Row label="Next data source" value={conf.recommendedNextDataSource} />
            ) : null}
          </div>
        ) : null}

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", marginBottom: 8 }}>REVENUE OPPORTUNITY</div>
          <Row label="Affected pop." value={rev.estimatedPopulationAffected.toLocaleString()} />
          <Row label="Est. demand" value={rev.estimatedServiceDemand.toLocaleString()} />
          <Row label="Opportunity score" value={rev.opportunityScore} />
          <Row label="Revenue potential" value={rev.revenuePotential} />
          <p style={{ fontSize: 13, fontWeight: 600, margin: "8px 0 0" }}>{rev.recommendedPlay}</p>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", marginBottom: 8 }}>REASONS</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.55, color: "#57534e" }}>
            {record.reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", marginBottom: 8 }}>EVIDENCE</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.55, color: "#57534e" }}>
            {record.evidence.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
