"use client";

import { SectionHeader }  from "@/components/aihsafe/common/SectionHeader";
import { GuardianInbox }  from "@/components/aihsafe/guardian/GuardianInbox";
import type { ApprovalRequestDTO } from "@/types/aihsafe/dto";

interface Props {
  pendingApprovals: ApprovalRequestDTO[];
  onInviteClick:       () => void;
  onCreateFamilyClick: () => void;
  onCreateSpaceClick:  () => void;
}

const actionBtn: React.CSSProperties = {
  display:      "flex",
  alignItems:   "center",
  gap:          10,
  width:        "100%",
  textAlign:    "left",
  background:   "#fafaf9",
  border:       "1px solid #e7e5e4",
  borderRadius: 12,
  padding:      "13px 16px",
  cursor:       "pointer",
  marginBottom: 8,
  transition:   "background 0.12s",
};

const iconBox = (bg: string): React.CSSProperties => ({
  width:          34,
  height:         34,
  borderRadius:   10,
  background:     bg,
  display:        "flex",
  alignItems:     "center",
  justifyContent: "center",
  fontSize:       16,
  flexShrink:     0,
});

export function ActionCenter({
  pendingApprovals,
  onInviteClick,
  onCreateFamilyClick,
  onCreateSpaceClick,
}: Props) {
  const hasPending = pendingApprovals.length > 0;

  return (
    <div>
      {/* Guardian inbox — prominent when there are pending items */}
      {hasPending && (
        <div
          style={{
            background:   "#fff",
            borderRadius: 16,
            border:       "1px solid #fde68a",
            padding:      "20px 22px",
            marginBottom: 14,
          }}
        >
          <SectionHeader
            title="Guardian Inbox"
            action={
              <span
                style={{
                  background:   "#fef3c7",
                  color:        "#92400e",
                  fontSize:     11,
                  fontWeight:   700,
                  borderRadius: 20,
                  padding:      "2px 10px",
                }}
              >
                {pendingApprovals.length} pending
              </span>
            }
          />
          <GuardianInbox />
        </div>
      )}

      {/* Quick actions */}
      <div
        style={{
          background:   "#fff",
          borderRadius: 16,
          border:       "1px solid #e7e5e4",
          padding:      "20px 22px",
          marginBottom: 14,
        }}
      >
        <SectionHeader title="Quick Actions" />

        <button type="button" style={actionBtn} onClick={onInviteClick}>
          <div style={iconBox("#f0fdf4")}>📨</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#1c1917" }}>Invite someone</div>
            <div style={{ fontSize: 12, color: "#a8a29e" }}>Send a governed invite</div>
          </div>
        </button>

        <button type="button" style={actionBtn} onClick={onCreateFamilyClick}>
          <div style={iconBox("#eff6ff")}>🏠</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#1c1917" }}>New family group</div>
            <div style={{ fontSize: 12, color: "#a8a29e" }}>Your household or close relatives</div>
          </div>
        </button>

        <button type="button" style={{ ...actionBtn, marginBottom: 0 }} onClick={onCreateSpaceClick}>
          <div style={iconBox("#faf5ff")}>🤝</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#1c1917" }}>New trusted space</div>
            <div style={{ fontSize: 12, color: "#a8a29e" }}>Peer pod, extended circle, guardian hub</div>
          </div>
        </button>
      </div>

      {/* Guardian inbox — collapsed state when inbox is clear */}
      {!hasPending && (
        <div
          style={{
            background:   "#fff",
            borderRadius: 16,
            border:       "1px solid #e7e5e4",
            padding:      "20px 22px",
            marginBottom: 14,
          }}
        >
          <SectionHeader title="Guardian Inbox" />
          <p style={{ fontSize: 13, color: "#a8a29e", margin: 0 }}>
            ✓ All clear — nothing waiting for your approval.
          </p>
        </div>
      )}
    </div>
  );
}
