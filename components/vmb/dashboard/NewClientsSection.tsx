"use client";

import { ActionButton, OperatingSection, statRowStyle } from "@/components/vmb/dashboard/OperatingSection";
import type { NewClientSummary } from "@/lib/vmb/operating-system/types";
import { VMB_THEME } from "@/lib/vmb/theme";

type Props = {
  summary: NewClientSummary;
  previewId: string | null;
  onPreview: (id: string) => void;
  onApprove: (id: string) => void;
};

export function NewClientsSection({ summary, previewId, onPreview, onApprove }: Props) {
  return (
    <OperatingSection
      title="New Clients"
      subtitle="Always-on onboarding — welcome new clients and invite them into your network."
    >
      <div style={statRowStyle}>
        <span>
          New Clients This Week:{" "}
          <strong style={{ color: VMB_THEME.ink }}>{summary.newClientsThisWeek}</strong>
        </span>
        <span>
          Ready To Welcome:{" "}
          <strong style={{ color: VMB_THEME.ink }}>{summary.readyToWelcome}</strong>
        </span>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {summary.rows.map((row) => (
          <div
            key={row.id}
            style={{
              padding: "14px 14px",
              borderRadius: 12,
              border: `1px solid ${VMB_THEME.line}`,
              background: previewId === row.id ? VMB_THEME.accentSoft : VMB_THEME.warmBg,
            }}
          >
            <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700 }}>{row.clientName}</p>
            <p style={{ margin: "0 0 4px", fontSize: 13, color: VMB_THEME.muted }}>
              Welcome Message
              {row.includesPrivateInvite ? " · Private Client Invitation" : ""}
            </p>
            {previewId === row.id ? (
              <p style={{ margin: "8px 0 12px", fontSize: 14, lineHeight: 1.5 }}>{row.welcomeMessage}</p>
            ) : null}
            <div style={{ display: "flex", gap: 8 }}>
              <ActionButton label="Preview" variant="secondary" onClick={() => onPreview(row.id)} />
              <ActionButton label="Approve" onClick={() => onApprove(row.id)} />
            </div>
          </div>
        ))}
      </div>
    </OperatingSection>
  );
}
