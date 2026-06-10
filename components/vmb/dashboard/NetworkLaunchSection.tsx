"use client";

import { ActionButton, OperatingSection, statRowStyle } from "@/components/vmb/dashboard/OperatingSection";
import type { NetworkLaunchSummary } from "@/lib/vmb/operating-system/types";
import { VMB_THEME } from "@/lib/vmb/theme";

type Props = {
  summary: NetworkLaunchSummary;
  onPreview: () => void;
  onApprove: () => void;
  previewOpen: boolean;
};

export function NetworkLaunchSection({ summary, onPreview, onApprove, previewOpen }: Props) {
  return (
    <OperatingSection
      title="Launch My Private Client Network"
      subtitle="One-time launch engine — invite your best clients into a private network."
    >
      <div style={statRowStyle}>
        <span>
          Top Candidates: <strong style={{ color: VMB_THEME.ink }}>{summary.topCandidates}</strong>
        </span>
        <span>
          Invited: <strong style={{ color: VMB_THEME.ink }}>{summary.invited}</strong>
        </span>
        <span>
          Joined: <strong style={{ color: VMB_THEME.ink }}>{summary.joined}</strong>
        </span>
        <span>
          Remaining: <strong style={{ color: VMB_THEME.ink }}>{summary.remaining}</strong>
        </span>
      </div>

      <p style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: VMB_THEME.ink }}>
        Ready This Week: {summary.readyThisWeek} Private Client Invites
      </p>

      {previewOpen ? (
        <ul
          style={{
            margin: "0 0 16px",
            padding: "12px 14px",
            listStyle: "none",
            borderRadius: 12,
            background: VMB_THEME.warmBg,
            border: `1px solid ${VMB_THEME.line}`,
            display: "grid",
            gap: 8,
            fontSize: 14,
          }}
        >
          {summary.candidates.map((candidate) => (
            <li key={candidate.clientName} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontWeight: 600 }}>{candidate.clientName}</span>
              <span style={{ color: VMB_THEME.muted }}>Score {candidate.candidateScore}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <ActionButton label="Preview Invites" variant="secondary" onClick={onPreview} />
        <ActionButton
          label="Approve This Week"
          onClick={onApprove}
          disabled={summary.readyThisWeek <= 0}
        />
      </div>
    </OperatingSection>
  );
}
