"use client";

import Link from "next/link";
import { ActionButton, OperatingSection, statRowStyle } from "@/components/vmb/dashboard/OperatingSection";
import { appendVmbAnalysisQuery } from "@/lib/vmb/trial-scope";
import type { WeeklyRevenueSummary } from "@/lib/vmb/operating-system/types";
import { VMB_THEME } from "@/lib/vmb/theme";

type Props = {
  summary: WeeklyRevenueSummary;
  analysisId?: string;
  showOpportunities: boolean;
  onToggleOpportunities: () => void;
};

export function WeeklyRevenueSection({
  summary,
  analysisId,
  showOpportunities,
  onToggleOpportunities,
}: Props) {
  return (
    <OperatingSection
      title="This Week's Revenue"
      subtitle="Revenue engine — who to contact and what to offer this week."
    >
      <div style={statRowStyle}>
        <span>
          Long Time No See: <strong style={{ color: VMB_THEME.ink }}>{summary.longTimeNoSee}</strong>
        </span>
        <span>
          Book Your Next Appointment:{" "}
          <strong style={{ color: VMB_THEME.ink }}>{summary.bookNextAppointment}</strong>
        </span>
        <span>
          Birthday: <strong style={{ color: VMB_THEME.ink }}>{summary.birthday}</strong>
        </span>
      </div>

      <p style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, color: VMB_THEME.accent }}>
        Potential Revenue: ${summary.potentialRevenue.toLocaleString()}
      </p>
      <p style={{ margin: "0 0 16px", fontSize: 14, color: VMB_THEME.muted }}>
        Ready This Week: {summary.readyThisWeek} Opportunities
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: showOpportunities ? 16 : 0 }}>
        <ActionButton
          label={showOpportunities ? "Hide Opportunities" : "Review Opportunities"}
          variant="secondary"
          onClick={onToggleOpportunities}
        />
        <Link
          href={appendVmbAnalysisQuery("/vmb/clients", analysisId, "this-week")}
          style={{
            display: "inline-block",
            padding: "11px 16px",
            borderRadius: 11,
            background: VMB_THEME.accent,
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Client Book · This Week
        </Link>
      </div>

      {showOpportunities ? (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${VMB_THEME.line}`, color: VMB_THEME.muted }}>
              {["Client", "Reason", "Suggested Action", "Potential Revenue"].map((col) => (
                <th key={col} style={{ textAlign: "left", padding: "8px 6px", fontSize: 10, fontWeight: 800 }}>
                  {col.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.opportunities.slice(0, 8).map((row) => (
              <tr key={row.id} style={{ borderBottom: `1px solid ${VMB_THEME.line}` }}>
                <td style={{ padding: "8px 6px", fontWeight: 600 }}>{row.clientName}</td>
                <td style={{ padding: "8px 6px", color: VMB_THEME.muted }}>{row.reason}</td>
                <td style={{ padding: "8px 6px" }}>{row.suggestedAction}</td>
                <td style={{ padding: "8px 6px", fontWeight: 700, color: VMB_THEME.accent }}>
                  ${row.potentialRevenue.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </OperatingSection>
  );
}
