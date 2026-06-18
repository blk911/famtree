"use client";

import type { CSSProperties } from "react";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { SuggestedInvitationRecommendation } from "@/lib/vmb/invites/suggested-invitation-workflow";

type Props = {
  recommendation: SuggestedInvitationRecommendation;
  onPreview: () => void;
  onApprove: () => void;
  onEditCopy: () => void;
  onPause: () => void;
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

export function SuggestedInvitationCard({
  recommendation,
  onPreview,
  onApprove,
  onEditCopy,
  onPause,
  busy = false,
}: Props) {
  const thumbnailUrl = recommendation.snapshot?.serviceImageUrl;

  return (
    <article
      className="vmb-suggested-invite-card"
      style={{
        borderRadius: 14,
        border: `1px solid ${VMB_THEME.line}`,
        background: "#fff",
        padding: "18px 18px 16px",
        display: "grid",
        gap: 14,
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: VMB_THEME.muted }}>
            {recommendation.categoryLabel.toUpperCase()}
          </p>
          <h2 style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 800 }}>{recommendation.clientName}</h2>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: VMB_THEME.muted }}>
            {recommendation.reasonHeadline}
          </p>
        </div>
        {thumbnailUrl ? (
          <div
            aria-hidden
            style={{
              width: 56,
              height: 56,
              borderRadius: 10,
              background: `center/cover no-repeat url(${thumbnailUrl})`,
              border: `1px solid ${VMB_THEME.line}`,
              flexShrink: 0,
            }}
          />
        ) : null}
      </header>

      <div style={{ display: "grid", gap: 8 }}>
        <Row label="Suggested Invitation" value={recommendation.templateName} />
        {recommendation.services.length > 0 ? (
          <Row label="Services" value={recommendation.services.join(", ")} />
        ) : null}
        {recommendation.rewards.length > 0 ? (
          <Row label="Rewards" value={recommendation.rewards.join(", ")} />
        ) : null}
        <Row label="Estimated Value" value={`$${recommendation.estimatedValue.toLocaleString()}`} />
        {!recommendation.publishedCopy ? (
          <p style={{ margin: 0, fontSize: 12, color: "#b45309" }}>
            Template not published yet — preview uses the default library design.
          </p>
        ) : null}
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
        <button type="button" disabled={busy} onClick={onApprove} style={actionButtonStyle("primary")}>
          Approve
        </button>
        <button type="button" disabled={busy} onClick={onEditCopy} style={actionButtonStyle()}>
          Edit Copy
        </button>
        <button type="button" disabled={busy} onClick={onPause} style={actionButtonStyle()}>
          Pause
        </button>
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
