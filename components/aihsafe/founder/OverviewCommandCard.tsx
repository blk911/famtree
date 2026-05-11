// Compact attention signal for the Overview tab.
// Shows a one-line status with a "Review →" route to the Approvals tab.
// Does NOT embed GuardianInbox — full resolution lives in the Approvals tab only.

interface Props {
  pendingApprovalCount: number;
  pendingInviteCount:   number;
  loading:              boolean;
  onReviewApprovals:    () => void;
}

export function OverviewCommandCard({
  pendingApprovalCount,
  pendingInviteCount,
  loading,
  onReviewApprovals,
}: Props) {
  const total    = pendingApprovalCount + pendingInviteCount;
  const hasItems = total > 0;

  const parts: string[] = [];
  if (pendingApprovalCount > 0) {
    parts.push(`${pendingApprovalCount} guardian approval${pendingApprovalCount === 1 ? "" : "s"}`);
  }
  if (pendingInviteCount > 0) {
    parts.push(`${pendingInviteCount} invite${pendingInviteCount === 1 ? "" : "s"} awaiting response`);
  }

  return (
    <div
      style={{
        background:   hasItems ? "#fffbeb" : "#f0fdf4",
        border:       `1px solid ${hasItems ? "#fde68a" : "#bbf7d0"}`,
        borderRadius: 16,
        padding:      "15px 18px",
        marginBottom: 14,
        display:      "flex",
        alignItems:   "center",
        gap:          12,
      }}
    >
      <span
        style={{
          fontSize:       18,
          width:          34,
          height:         34,
          borderRadius:   "50%",
          background:     hasItems ? "#fbbf24" : "#34d399",
          display:        "inline-flex",
          alignItems:     "center",
          justifyContent: "center",
          flexShrink:     0,
        }}
        aria-hidden="true"
      >
        {hasItems ? "⏳" : "✓"}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#1c1917" }}>
          {loading
            ? "Checking…"
            : hasItems
            ? `${total} item${total === 1 ? "" : "s"} need${total === 1 ? "s" : ""} your attention`
            : "Everything looks clear today."}
        </div>
        {!loading && (
          <div style={{ fontSize: 12, color: "#78716c", marginTop: 2 }}>
            {hasItems
              ? parts.join(" · ")
              : "No approvals or pending invites require action."}
          </div>
        )}
      </div>

      {hasItems && !loading && (
        <button
          type="button"
          onClick={onReviewApprovals}
          style={{
            padding:      "6px 14px",
            borderRadius: 9,
            border:       "1px solid #fde68a",
            background:   "#fff",
            color:        "#92400e",
            fontWeight:   600,
            fontSize:     12,
            cursor:       "pointer",
            flexShrink:   0,
            whiteSpace:   "nowrap",
          }}
        >
          Review →
        </button>
      )}
    </div>
  );
}
