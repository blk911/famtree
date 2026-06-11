"use client";

import Link from "next/link";
import { WorkflowPanel } from "@/components/vmb/workflows/WorkflowPanel";
import { appendVmbAnalysisQuery } from "@/lib/vmb/trial-scope";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { WeeklyRevenueOpportunity } from "@/lib/vmb/operating-system/types";

type Props = {
  opportunities: WeeklyRevenueOpportunity[];
  analysisId?: string;
  onClose: () => void;
};

export function RevenueQueue({ opportunities, analysisId, onClose }: Props) {
  return (
    <WorkflowPanel title="Revenue Moves" onClose={onClose}>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 0 }}>
        {opportunities.map((row) => (
          <li
            key={row.id}
            style={{
              padding: "16px 0",
              borderBottom: `1px solid ${VMB_THEME.line}`,
            }}
          >
            <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800 }}>{row.clientName}</p>
            <p style={{ margin: "0 0 2px", fontSize: 13, color: VMB_THEME.muted }}>
              {row.reason}
            </p>
            <p style={{ margin: "0 0 2px", fontSize: 13, color: VMB_THEME.muted }}>
              Suggested action: {row.suggestedAction}
            </p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: VMB_THEME.accent }}>
              ${row.potentialRevenue.toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
      {analysisId ? (
        <Link
          href={appendVmbAnalysisQuery("/vmb/clients", analysisId, "this-week")}
          style={{
            display: "inline-block",
            marginTop: 16,
            fontSize: 14,
            fontWeight: 700,
            color: VMB_THEME.accent,
            textDecoration: "none",
          }}
        >
          Open in Client Book
        </Link>
      ) : null}
    </WorkflowPanel>
  );
}
