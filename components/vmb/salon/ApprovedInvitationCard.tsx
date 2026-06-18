"use client";

import type { CSSProperties } from "react";
import {
  formatApprovalDate,
} from "@/lib/vmb/invites/salon-invitation-approval-workflow";
import {
  resolveSnapshotRewardLabels,
  resolveSnapshotServiceLabels,
} from "@/lib/vmb/invites/invite-template-snapshot";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { SalonInvitationApproval } from "@/types/vmb/salon-invitation-approval";

type Props = {
  approval: SalonInvitationApproval;
  onPreview: () => void;
  onPause?: () => void;
  onResume?: () => void;
  busy?: boolean;
};

function actionButtonStyle(variant: "primary" | "default" = "default"): CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: 8,
    border: `1px solid ${variant === "primary" ? VMB_THEME.accent : VMB_THEME.line}`,
    background: variant === "primary" ? VMB_THEME.accentSoft : "#fff",
    fontSize: 13,
    fontWeight: 600,
    color: variant === "primary" ? VMB_THEME.ink : VMB_THEME.muted,
    cursor: "pointer",
  };
}

export function ApprovedInvitationCard({
  approval,
  onPreview,
  onPause,
  onResume,
  busy = false,
}: Props) {
  const services = resolveSnapshotServiceLabels(approval.snapshot);
  const rewards = resolveSnapshotRewardLabels(approval.snapshot);
  const isPaused = approval.status === "paused";

  return (
    <article
      className="vmb-approved-invite-card"
      style={{
        borderRadius: 14,
        border: `1px solid ${VMB_THEME.line}`,
        background: "#fff",
        padding: "18px 18px 16px",
        display: "grid",
        gap: 14,
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: VMB_THEME.muted }}>
            {approval.opportunityType.toUpperCase()}
          </p>
          <h2 style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 800 }}>{approval.clientName}</h2>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: VMB_THEME.muted }}>{approval.reasonText}</p>
        </div>
        <span
          style={{
            flexShrink: 0,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            padding: "4px 8px",
            borderRadius: 999,
            background: isPaused ? "#fef3c7" : VMB_THEME.accentSoft,
            color: isPaused ? "#92400e" : VMB_THEME.ink,
          }}
        >
          {isPaused ? "Paused" : "Approved"}
        </span>
      </header>

      <div style={{ display: "grid", gap: 8 }}>
        <Row label="Invitation" value={approval.snapshot.templateName} />
        {services.length > 0 ? <Row label="Services" value={services.join(", ")} /> : null}
        {rewards.length > 0 ? <Row label="Rewards" value={rewards.join(", ")} /> : null}
        <Row label="Approved" value={formatApprovalDate(approval.approvedAt ?? approval.createdAt)} />
      </div>

      <footer
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          paddingTop: 4,
          borderTop: `1px solid ${VMB_THEME.line}`,
        }}
      >
        <button type="button" disabled={busy} onClick={onPreview} style={actionButtonStyle()}>
          Preview
        </button>
        {!isPaused && onPause ? (
          <button type="button" disabled={busy} onClick={onPause} style={actionButtonStyle()}>
            Pause
          </button>
        ) : null}
        {isPaused && onResume ? (
          <button type="button" disabled={busy} onClick={onResume} style={actionButtonStyle("primary")}>
            Resume
          </button>
        ) : null}
      </footer>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8, alignItems: "baseline" }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: VMB_THEME.muted }}>{label}</p>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{value}</p>
    </div>
  );
}
