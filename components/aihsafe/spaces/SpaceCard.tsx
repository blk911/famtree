import React from "react";
import { SpaceKindBadge } from "@/components/aihsafe/spaces/SpaceKindBadge";

const VISIBILITY_LABEL: Record<string, string> = {
  trust_unit:      "Trusted circle",
  family:          "Family only",
  extended_trust:  "Extended circle",
  public_approved: "Approved network",
  guardian_only:   "Guardian only",
  private:         "Private",
};

export interface LeaveAction {
  membershipId: string;
  busy:         boolean;
  errorMsg?:    string;
  onLeave:      (membershipId: string) => void;
}

interface Props {
  /** Display name — pass undefined/null to fall back to kind label. */
  name?:            string | null;
  kind:             string;
  memberCount:      number;
  visibilityScope?: string;
  /** Badge shown when user created this space. */
  isCreator?:       boolean;
  /** Shown when user is an active member (non-creator). */
  isMember?:        boolean;
  /** Present → render Leave button. */
  leaveAction?:     LeaveAction;
  /** Present → render Invite button. */
  onInvite?:        () => void;
}

export function SpaceCard({
  name,
  kind,
  memberCount,
  visibilityScope,
  isCreator,
  isMember,
  leaveAction,
  onInvite,
}: Props) {
  const displayName   = name?.trim() ? name : `${kind.charAt(0).toUpperCase()}${kind.slice(1)} space`;
  const visibilityTxt = visibilityScope ? VISIBILITY_LABEL[visibilityScope] : undefined;

  return (
    <div
      style={{
        background:   "#fff",
        borderRadius: 14,
        border:       "1px solid #e7e5e4",
        padding:      "16px 18px",
        marginBottom: 10,
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Kind icon chip */}
        <div
          aria-hidden="true"
          style={{
            width:          38,
            height:         38,
            borderRadius:   11,
            background:     "#f4f4f5",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            fontSize:       18,
            flexShrink:     0,
          }}
        >
          <SpaceKindBadge kind={kind} iconOnly />
        </div>

        {/* Name + badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span
              style={{
                fontWeight:   700,
                fontSize:     15,
                color:        "#1c1917",
                overflow:     "hidden",
                textOverflow: "ellipsis",
                whiteSpace:   "nowrap",
              }}
            >
              {displayName}
            </span>
            <SpaceKindBadge kind={kind} />
            {isCreator && (
              <span
                style={{
                  fontSize:     10,
                  fontWeight:   700,
                  color:        "#6d28d9",
                  background:   "#f5f3ff",
                  borderRadius: 6,
                  padding:      "2px 7px",
                  whiteSpace:   "nowrap",
                }}
              >
                Founded by you
              </span>
            )}
            {!isCreator && isMember && (
              <span
                style={{
                  fontSize:     10,
                  fontWeight:   600,
                  color:        "#059669",
                  background:   "#f0fdf4",
                  borderRadius: 6,
                  padding:      "2px 7px",
                  whiteSpace:   "nowrap",
                }}
              >
                Active member
              </span>
            )}
          </div>

          {/* Sub-line */}
          <div style={{ fontSize: 12, color: "#a8a29e", marginTop: 3, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span>
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </span>
            {visibilityTxt && (
              <>
                <span aria-hidden="true">·</span>
                <span>{visibilityTxt}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action row */}
      {(leaveAction || onInvite) && (
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {onInvite && (
            <button
              type="button"
              onClick={onInvite}
              style={{
                padding:      "6px 14px",
                borderRadius: 8,
                border:       "1px solid #e7e5e4",
                background:   "#fafaf9",
                color:        "#44403c",
                fontWeight:   600,
                fontSize:     12,
                cursor:       "pointer",
              }}
            >
              📨 Invite
            </button>
          )}
          {leaveAction && (
            <button
              type="button"
              onClick={() => leaveAction.onLeave(leaveAction.membershipId)}
              disabled={leaveAction.busy}
              style={{
                padding:      "6px 14px",
                borderRadius: 8,
                border:       "1px solid #fca5a5",
                background:   "#fff",
                color:        "#dc2626",
                fontWeight:   600,
                fontSize:     12,
                cursor:       leaveAction.busy ? "not-allowed" : "pointer",
                opacity:      leaveAction.busy ? 0.55 : 1,
              }}
            >
              {leaveAction.busy ? "…" : "Leave"}
            </button>
          )}
        </div>
      )}

      {/* Leave error */}
      {leaveAction?.errorMsg && (
        <p role="alert" style={{ fontSize: 12, color: "#dc2626", margin: "8px 0 0" }}>
          ⚠ {leaveAction.errorMsg}
        </p>
      )}
    </div>
  );
}
