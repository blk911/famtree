"use client";

import type { ProspectRecord } from "@/lib/studios/prospects/types";
function tagLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function confColor(n: number) {
  if (n >= 75) return "#15803d";
  if (n >= 50) return "#d97706";
  return "#78716c";
}

type Props = {
  prospect: ProspectRecord;
  recommendedPlay?: string | null;
  /** Extra notes from detail API (classification notes). */
  opportunityNotes?: string | null;
};

export function AdvancedIntelligenceSection({
  prospect,
  recommendedPlay,
  opportunityNotes,
}: Props) {
  const score = prospect.overallOpportunityScore;
  const signals = [
    ...(prospect.platformSignals ?? []).map((s) =>
      typeof s === "string" ? tagLabel(s) : String(s),
    ),
    ...(prospect.offerFitTags ?? []).map(tagLabel),
  ];
  const notes =
    opportunityNotes ??
    ((prospect.classificationNotes ?? []).join(" · ") || null);

  return (
    <details
      style={{
        marginBottom: 12,
        background: "#fff",
        border: "1px solid #e7e5e4",
        borderRadius: 8,
      }}
    >
      <summary
        style={{
          padding: "8px 10px",
          fontSize: 10,
          fontWeight: 800,
          color: "#a8a29e",
          letterSpacing: "0.06em",
          cursor: "pointer",
          listStyle: "none",
        }}
      >
        ADVANCED INTELLIGENCE
      </summary>
      <div style={{ padding: "0 10px 10px", fontSize: 11, color: "#57534e" }}>
        <div style={{ marginBottom: 6 }}>
          <span style={{ fontWeight: 700, color: "#a8a29e" }}>Score: </span>
          <span style={{ fontWeight: 800, color: confColor(score ?? 0) }}>
            {score ?? "—"}
          </span>
        </div>
        <div style={{ marginBottom: 6 }}>
          <span style={{ fontWeight: 700, color: "#a8a29e" }}>Signals: </span>
          {signals.length > 0 ? signals.join(", ") : "—"}
        </div>
        <div style={{ marginBottom: 6 }}>
          <span style={{ fontWeight: 700, color: "#a8a29e" }}>Recommended play: </span>
          {recommendedPlay ?? prospect.classificationNotes?.[0] ?? "—"}
        </div>
        <div>
          <span style={{ fontWeight: 700, color: "#a8a29e" }}>Opportunity notes: </span>
          {notes || "—"}
        </div>
        {(prospect.classificationNotes ?? []).length > 1 ? (
          <ul style={{ margin: "6px 0 0", paddingLeft: 16 }}>
            {(prospect.classificationNotes ?? []).slice(1).map((n) => (
              <li key={n} style={{ marginBottom: 2 }}>
                {n}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}
