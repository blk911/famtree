"use client";

import type { CountyOpportunityDossier } from "@/lib/intelligence/transpo/opportunity-dossiers/county-opportunity-types";
import {
  OPPORTUNITY_TYPE_LABELS,
  TIME_HORIZON_LABELS,
  type TranspoOpportunityType,
  type TranspoTimeHorizon,
} from "@/lib/intelligence/transpo/network-formation/network-formation-types";

type Props = {
  dossier: CountyOpportunityDossier;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8, fontSize: 12, marginBottom: 8 }}>
      <span style={{ color: "#a8a29e", fontWeight: 700 }}>{label}</span>
      <span style={{ color: "#44403c" }}>{value}</span>
    </div>
  );
}

export function NearTermOpportunityPanel({ dossier }: Props) {
  if (!dossier.opportunityType) return null;
  const typeLabel = OPPORTUNITY_TYPE_LABELS[dossier.opportunityType as TranspoOpportunityType] ?? dossier.opportunityType;
  const horizonLabel = dossier.timeHorizon
    ? TIME_HORIZON_LABELS[dossier.timeHorizon as TranspoTimeHorizon]
    : "—";

  return (
    <div style={{ marginTop: 14, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: "#166534", marginBottom: 10 }}>NEAR-TERM OPPORTUNITY</div>
      <Row label="Type" value={typeLabel} />
      <Row label="Time horizon" value={
        <span>
          {horizonLabel}
          {dossier.timeHorizon === "next_week" ? (
            <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: "#991b1b", background: "#fef2f2" }}>Next Week</span>
          ) : null}
        </span>
      } />
      {dossier.nearTermPlay ? <Row label="Near-term play" value={dossier.nearTermPlay} /> : null}
      {dossier.firstMove ? <Row label="First move" value={dossier.firstMove} /> : null}
      {dossier.expectedOutcome ? <Row label="Expected outcome" value={dossier.expectedOutcome} /> : null}
      {dossier.localNetworkTargets && dossier.localNetworkTargets.length > 0 ? (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", marginBottom: 6 }}>LOCAL NETWORK TARGETS</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.55, color: "#57534e" }}>
            {dossier.localNetworkTargets.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </div>
      ) : null}
      {dossier.nextWeekActions && dossier.nextWeekActions.length > 0 ? (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#a8a29e", marginBottom: 6 }}>NEXT WEEK ACTIONS</div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.55, color: "#57534e" }}>
            {dossier.nextWeekActions.map((a) => <li key={a}>{a}</li>)}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
