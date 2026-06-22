"use client";

import type { CSSProperties } from "react";
import { SalonInvitationThumbnail } from "@/components/vmb/salon/SalonInvitationThumbnail";
import {
  formatSnapshotUpdatedAt,
  resolveSnapshotRewardLabels,
  resolveSnapshotServiceLabels,
} from "@/lib/vmb/invites/invite-template-snapshot";
import { resolveInvitationPricing } from "@/lib/vmb/invites/invitation-pricing-display";
import { formatInvitationPrice } from "@/lib/vmb/invites/invitation-package-pricing";
import type { SalonInviteLocalCopy } from "@/lib/vmb/invites/publish-template-to-salons";
import {
  getSalonInviteInventoryStatus,
  salonInviteInventoryStatusLabel,
} from "@/lib/vmb/invites/salon-invite-inventory";
import type { InviteTemplateTokenContext } from "@/lib/vmb/invite-templates/invite-template-types";
import { VMB_THEME } from "@/lib/vmb/theme";

type Props = {
  copy: SalonInviteLocalCopy;
  tokenContext?: InviteTemplateTokenContext;
  busy?: boolean;
  onPreview: () => void;
  onEditCopy: () => void;
  onPause: () => void;
  onApprove?: () => void;
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

function displayTouchPointName(name: string): string {
  return name === "Private Client Network" ? "Private Client Invite" : name;
}

export function PublishedInvitationInventoryCard({
  copy,
  tokenContext,
  busy = false,
  onPreview,
  onEditCopy,
  onPause,
  onApprove,
}: Props) {
  const services = resolveSnapshotServiceLabels(copy.snapshot);
  const rewards = resolveSnapshotRewardLabels(copy.snapshot);
  const pricing = resolveInvitationPricing(copy.snapshot);
  const status = getSalonInviteInventoryStatus(copy);
  const isPaused = status === "paused";
  const needsReview = status === "needs_review";
  const templateName = displayTouchPointName(copy.snapshot.templateName);

  return (
    <article
      className="vmb-published-invite-card"
      style={{
        borderRadius: 14,
        border: `1px solid ${isPaused ? "#fcd34d" : needsReview ? "#f9a8d4" : VMB_THEME.line}`,
        background: "#fff",
        display: "grid",
        gridTemplateColumns: "minmax(180px, 0.8fr) minmax(0, 1.2fr)",
        gap: 16,
        padding: 16,
        minWidth: 0,
      }}
    >
      <SalonInvitationThumbnail snapshot={copy.snapshot} tokenContext={tokenContext} />

      <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, lineHeight: 1.25 }}>
              {templateName}
            </h3>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: VMB_THEME.muted }}>
              v{copy.publishedVersion} · Updated {formatSnapshotUpdatedAt(copy.snapshot)}
            </p>
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
              background: isPaused ? "#fef3c7" : needsReview ? "#fdf2f8" : VMB_THEME.accentSoft,
              color: isPaused ? "#92400e" : needsReview ? "#9d174d" : VMB_THEME.ink,
            }}
          >
            {salonInviteInventoryStatusLabel(copy)}
          </span>
        </div>

        <div className="vmb-published-invite-card__detail-grid">
          {services.length > 0 ? (
            <InventoryRow label="Services" value={services.join(", ")} />
          ) : null}
          {rewards.length > 0 ? (
            <InventoryRow label="Rewards" value={rewards.join(", ")} />
          ) : null}
          {copy.snapshot.expirationLabel ? (
            <InventoryRow label="Expiration" value={copy.snapshot.expirationLabel} />
          ) : null}
          <InventoryRow label="Value" value={pricing.valueLabel} />
          {pricing.savingsAmount > 0 ? (
            <InventoryRow label="Savings" value={formatInvitationPrice(pricing.savingsAmount)} />
          ) : null}
          <InventoryRow label="Offer" value={pricing.priceLabel} />
        </div>

        <footer
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            paddingTop: 8,
            borderTop: `1px solid ${VMB_THEME.line}`,
          }}
        >
          <button type="button" disabled={busy} onClick={onPreview} style={actionButtonStyle()}>
            Preview
          </button>
          <button type="button" disabled={busy} onClick={onEditCopy} style={actionButtonStyle()}>
            Edit Copy
          </button>
          {needsReview && onApprove ? (
            <button type="button" disabled={busy} onClick={onApprove} style={actionButtonStyle("primary")}>
              Approve for Salon
            </button>
          ) : null}
          {!needsReview ? (
            <button type="button" disabled={busy} onClick={onPause} style={actionButtonStyle()}>
              {isPaused ? "Resume" : "Pause"}
            </button>
          ) : null}
        </footer>
      </div>
    </article>
  );
}

function InventoryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: VMB_THEME.muted }}>{label}</p>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.45 }}>{value}</p>
    </div>
  );
}
