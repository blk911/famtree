"use client";

import { GuardianInbox }  from "@/components/aihsafe/guardian/GuardianInbox";
import type { ApprovalRequestDTO, InviteDTO } from "@/types/aihsafe/dto";

const STATUS_LABELS: Record<string, string> = {
  PENDING:    "Awaiting response",
  ACCEPTED:   "Accepted",
  REGISTERED: "Joined",
  EXPIRED:    "Expired",
  CANCELLED:  "Cancelled",
};

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  PENDING:    { bg: "#fef3c7", fg: "#92400e" },
  ACCEPTED:   { bg: "#d1fae5", fg: "#065f46" },
  REGISTERED: { bg: "#d1fae5", fg: "#065f46" },
  EXPIRED:    { bg: "#f5f5f4", fg: "#78716c" },
  CANCELLED:  { bg: "#fee2e2", fg: "#991b1b" },
};

interface Props {
  pendingApprovals: ApprovalRequestDTO[];
  pendingInvites:   InviteDTO[];
  loading:          boolean;
}

export function PendingAttention({ pendingApprovals, pendingInvites, loading }: Props) {
  const hasApprovals = pendingApprovals.length > 0;
  const hasPendingInvites = pendingInvites.some(i => i.status === "PENDING");
  const hasAnything = hasApprovals || hasPendingInvites;
  const totalItems  = pendingApprovals.length + pendingInvites.filter(i => i.status === "PENDING").length;

  const borderColor = hasAnything ? "#fde68a" : "#d1fae5";
  const headerBg    = hasAnything ? "#fffbeb" : "#f0fdf4";
  const badgeBg     = hasAnything ? "#fef3c7" : "#d1fae5";
  const badgeFg     = hasAnything ? "#92400e" : "#065f46";

  return (
    <div
      style={{
        background:   "#fff",
        borderRadius: 18,
        border:       `2px solid ${borderColor}`,
        overflow:     "hidden",
        marginBottom: 20,
      }}
    >
      {/* Header strip */}
      <div
        style={{
          background:     headerBg,
          padding:        "16px 22px",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          gap:            12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize:       18,
              width:          32,
              height:         32,
              background:     hasAnything ? "#fbbf24" : "#34d399",
              borderRadius:   "50%",
              display:        "inline-flex",
              alignItems:     "center",
              justifyContent: "center",
              flexShrink:     0,
            }}
            aria-hidden="true"
          >
            {hasAnything ? "⏳" : "✓"}
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1c1917" }}>
              {hasAnything ? "Needs your attention" : "All clear"}
            </div>
            <div style={{ fontSize: 12, color: "#78716c", marginTop: 1 }}>
              {hasAnything
                ? `${totalItems} item${totalItems === 1 ? "" : "s"} waiting for your review`
                : "No approvals or invites require action right now"}
            </div>
          </div>
        </div>

        {!loading && (
          <span
            style={{
              background:   badgeBg,
              color:        badgeFg,
              fontSize:     12,
              fontWeight:   700,
              borderRadius: 20,
              padding:      "4px 12px",
              whiteSpace:   "nowrap",
              flexShrink:   0,
            }}
          >
            {hasAnything ? `${totalItems} pending` : "All resolved"}
          </span>
        )}
      </div>

      {/* Approvals section */}
      {hasApprovals && (
        <div style={{ padding: "16px 22px", borderBottom: "1px solid #fde68a" }}>
          <div
            style={{
              fontSize:      11,
              fontWeight:    700,
              color:         "#92400e",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              marginBottom:  12,
            }}
          >
            Guardian approvals
          </div>
          <GuardianInbox />
        </div>
      )}

      {/* Pending invites */}
      {hasPendingInvites && (
        <div style={{ padding: "16px 22px" }}>
          <div
            style={{
              fontSize:      11,
              fontWeight:    700,
              color:         "#44403c",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              marginBottom:  12,
            }}
          >
            Sent invites — awaiting response
          </div>
          {pendingInvites
            .filter(i => i.status === "PENDING")
            .map(inv => {
              const sc = STATUS_COLORS[inv.status] ?? { bg: "#f5f5f4", fg: "#44403c" };
              return (
                <div
                  key={inv.id}
                  style={{
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "space-between",
                    padding:        "10px 14px",
                    borderRadius:   12,
                    border:         "1px solid #e7e5e4",
                    background:     "#fafaf9",
                    marginBottom:   8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#1c1917" }}>
                      {inv.recipientEmail}
                    </div>
                    <div style={{ fontSize: 12, color: "#78716c", marginTop: 2 }}>
                      Sent {new Date(inv.createdAt).toLocaleDateString()}
                      {" · "}expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize:     11,
                      fontWeight:   700,
                      background:   sc.bg,
                      color:        sc.fg,
                      borderRadius: 8,
                      padding:      "3px 10px",
                      flexShrink:   0,
                    }}
                  >
                    {STATUS_LABELS[inv.status] ?? inv.status}
                  </span>
                </div>
              );
            })}
        </div>
      )}

      {/* Empty state — all clear */}
      {!hasAnything && !loading && (
        <div style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              "No guardian approvals waiting",
              "No invites pending a response",
              "Governance is current",
            ].map(item => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#059669", fontSize: 14, fontWeight: 700 }}>✓</span>
                <span style={{ fontSize: 13, color: "#44403c" }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div style={{ padding: "20px 22px" }}>
          <p style={{ fontSize: 13, color: "#a8a29e", margin: 0 }}>Loading…</p>
        </div>
      )}
    </div>
  );
}
