import type { HiddenMoneyReport } from "@/lib/intelligence/salon/backoffice/types";
import { STUDIOS_CARD_SHADOW, STUDIOS_INK, STUDIOS_LINE, STUDIOS_MUTED } from "@/lib/studios/visual";

const ACCENT = "#9d174d";

type Props = {
  report: HiddenMoneyReport;
  title?: string;
};

export function HiddenMoneyReportPanel({ report, title = "Hidden Money Report" }: Props) {
  return (
    <div
      style={{
        padding: "24px 22px",
        borderRadius: 18,
        background: "#fff",
        border: `1px solid ${STUDIOS_LINE}`,
        boxShadow: STUDIOS_CARD_SHADOW,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: ACCENT,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      <p style={{ fontSize: 15, color: STUDIOS_INK, margin: "0 0 16px", lineHeight: 1.55 }}>
        {report.summary}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        {Object.entries(report.metrics).map(([k, v]) =>
          v != null ? (
            <span
              key={k}
              style={{
                fontSize: 12,
                fontWeight: 700,
                background: "#ecfdf5",
                color: "#166534",
                border: "1px solid #bbf7d0",
                borderRadius: 8,
                padding: "6px 11px",
              }}
            >
              {k}:{" "}
              {typeof v === "number" && (k === "totalRevenue" || k === "avgTicket") ? `$${v}` : v}
            </span>
          ) : null,
        )}
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {report.opportunities.map((opp) => (
          <div
            key={opp.id}
            style={{
              border: `1px solid ${STUDIOS_LINE}`,
              borderRadius: 12,
              padding: "14px 16px",
              background: "#fafaf9",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 6,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 800, color: STUDIOS_INK }}>{opp.title}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: STUDIOS_MUTED,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {opp.confidence}
              </span>
            </div>
            <p style={{ fontSize: 14, color: STUDIOS_MUTED, margin: 0, lineHeight: 1.5 }}>
              {opp.description}
            </p>
            {opp.estimatedValue ? (
              <p style={{ fontSize: 12, color: ACCENT, margin: "8px 0 0", fontWeight: 700 }}>
                {opp.estimatedValue}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
