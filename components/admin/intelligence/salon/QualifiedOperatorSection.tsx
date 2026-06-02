"use client";

import {
  QUALIFICATION_STATUS_COLORS,
  QUALIFICATION_STATUS_LABELS,
  RECOMMENDED_ACTION_LABELS,
  type QualifiedOperatorResult,
} from "@/lib/intelligence/salon/qualified-operator/types";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#a8a29e", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: "#44403c", lineHeight: 1.45 }}>{children}</div>
    </div>
  );
}

export function QualifiedOperatorSection({
  qualification,
}: {
  qualification: QualifiedOperatorResult | null | undefined;
}) {
  if (!qualification) return null;

  const statusStyle =
    QUALIFICATION_STATUS_COLORS[qualification.qualificationStatus] ?? {
      bg: "#f5f5f4",
      fg: "#57534e",
    };

  return (
    <section style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: "#a8a29e",
          letterSpacing: "0.06em",
          marginBottom: 8,
        }}
      >
        QUALIFIED OPERATOR
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            background: statusStyle.bg,
            color: statusStyle.fg,
            borderRadius: 20,
            padding: "3px 10px",
          }}
        >
          {QUALIFICATION_STATUS_LABELS[qualification.qualificationStatus]}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            background: "#fafaf9",
            border: "1px solid #e7e5e4",
            borderRadius: 20,
            padding: "3px 10px",
            color: "#57534e",
          }}
        >
          Score {qualification.qualifiedOperatorScore}
        </span>
      </div>
      <Row label="Recommended next action">
        {RECOMMENDED_ACTION_LABELS[qualification.recommendedNextAction]}
      </Row>
      <Row label="Why qualified / scored">
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {qualification.qualificationReasons.map((r) => (
            <li key={`${r.code}-${r.label}`} style={{ fontSize: 11, marginBottom: 4 }}>
              {r.delta !== 0 ? (
                <span style={{ fontWeight: 700, color: r.delta > 0 ? "#15803d" : "#b91c1c" }}>
                  {r.delta > 0 ? "+" : ""}
                  {r.delta}{" "}
                </span>
              ) : null}
              {r.label}
            </li>
          ))}
        </ul>
      </Row>
      <Row label="Signals">
        <span style={{ fontSize: 11, color: "#57534e" }}>
          {[
            qualification.confirmedBooking ? "Confirmed booking" : null,
            qualification.importCandidate ? "Import candidate" : null,
            qualification.stackSignalCount > 0
              ? `${qualification.stackSignalCount} stack signals`
              : null,
            qualification.hasContactOrWebsite ? "Contact / website" : null,
            qualification.highSocialSignal ? "High social" : null,
          ]
            .filter(Boolean)
            .join(" · ") || "Minimal signals"}
        </span>
      </Row>
    </section>
  );
}
