// AIH Safe — surfaces governance 202/403 outcomes as a human-readable notice.
// 202 → "Guardian approval needed" (amber)
// 403 → reason-code-mapped denial message (red)

import type { AihEscalated, AihDenied } from "./apiClient";

interface Props {
  result:    AihEscalated | AihDenied;
  onDismiss?: () => void;
}

// Map stable governance reasonCodes to family-friendly copy.
// UI must branch on reasonCode, not on error.message (which may change).
const REASON_COPY: Record<string, string> = {
  REQUIRES_GUARDIAN_APPROVAL:         "A guardian needs to approve this before it happens.",
  DENIED_MINOR_REQUIRES_GUARDIAN:     "Your guardian needs to do this on your behalf.",
  DENIED_NOT_MEMBER:                  "You're not a member of that space.",
  DENIED_INSUFFICIENT_ROLE:           "Your role in this space doesn't allow that.",
  DENIED_NOT_GUARDIAN:                "No active guardian relationship was found.",
  DENIED_SCOPE_NOT_ALLOWED:           "That visibility setting isn't available for your account.",
  DENIED_NOT_AUTHENTICATED:           "You need to sign in first.",
  DENIED_TARGET_NOT_FOUND:            "That space or person wasn't found.",
  DENIED_UNSUPPORTED_ACTION:          "That action isn't available yet.",
  REQUIRES_UNIT_ADMIN_APPROVAL:       "The space moderator needs to approve this.",
};

export function DecisionNotice({ result, onDismiss }: Props) {
  const isPending = result.kind === "pending";
  const accent    = isPending ? "#d97706" : "#dc2626";
  const bg        = isPending ? "#fffbeb" : "#fef2f2";
  const border    = isPending ? "#fcd34d" : "#fca5a5";

  const title = isPending
    ? "Waiting for guardian approval"
    : (REASON_COPY[(result as AihDenied).code] ? "Action not allowed" : "Action not allowed");

  const body = isPending
    ? `Your request is waiting. Once a guardian approves, it will happen automatically. Reference: ${(result as AihEscalated).approvalRequestId}`
    : (REASON_COPY[(result as AihDenied).code] ?? (result as AihDenied).message);

  return (
    <div
      role="status"
      style={{
        background:    bg,
        border:        `1px solid ${border}`,
        borderRadius:  14,
        padding:       "14px 18px",
        marginTop:     16,
        display:       "flex",
        alignItems:    "flex-start",
        gap:           12,
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.4 }}>
        {isPending ? "⏳" : "⛔"}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: accent, fontSize: 14, marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: "#57534e", lineHeight: 1.5 }}>{body}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notice"
          style={{
            background: "none",
            border:     "none",
            cursor:     "pointer",
            fontSize:   18,
            color:      "#a8a29e",
            flexShrink: 0,
            lineHeight: 1,
            padding:    0,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
