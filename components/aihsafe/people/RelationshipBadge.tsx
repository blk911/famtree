import React from "react";

type Kind            = "parent" | "grandparent" | "legal_guardian" | "trusted_adult";
type PermissionLevel = "view_only" | "approver" | "full_control";

const KIND_LABEL: Record<Kind, string> = {
  parent:          "Parent",
  grandparent:     "Grandparent",
  legal_guardian:  "Legal guardian",
  trusted_adult:   "Trusted adult",
};

const PERM_LABEL: Record<PermissionLevel, string> = {
  view_only:    "View only",
  approver:     "Approver",
  full_control: "Full control",
};

const PERM_COLOR: Record<PermissionLevel, { bg: string; color: string }> = {
  view_only:    { bg: "#f1f5f9", color: "#475569" },
  approver:     { bg: "#fef9c3", color: "#854d0e" },
  full_control: { bg: "#ede9fe", color: "#5b21b6" },
};

interface Props {
  kind?:            Kind;
  permissionLevel?: PermissionLevel;
  /** Render as a compact chip (no label prefix). Defaults to true. */
  compact?: boolean;
}

export function RelationshipBadge({ kind, permissionLevel, compact = true }: Props) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
      {kind && (
        <span
          style={{
            display:      "inline-block",
            background:   "#f0f9ff",
            color:        "#0369a1",
            fontSize:     10,
            fontWeight:   600,
            borderRadius: 6,
            padding:      compact ? "2px 7px" : "3px 9px",
            whiteSpace:   "nowrap",
          }}
        >
          {KIND_LABEL[kind]}
        </span>
      )}
      {permissionLevel && (
        <span
          style={{
            display:      "inline-block",
            background:   PERM_COLOR[permissionLevel].bg,
            color:        PERM_COLOR[permissionLevel].color,
            fontSize:     10,
            fontWeight:   600,
            borderRadius: 6,
            padding:      compact ? "2px 7px" : "3px 9px",
            whiteSpace:   "nowrap",
          }}
        >
          {PERM_LABEL[permissionLevel]}
        </span>
      )}
    </span>
  );
}
