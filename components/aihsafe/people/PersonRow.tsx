import React from "react";

interface Props {
  name:     string;
  /** Sub-line text: shared spaces, joined date, expiry, etc. */
  detail?:  string;
  /** Relationship badge(s) rendered after the name. */
  badge?:   React.ReactNode;
  /** Optional trailing actions (e.g. remove link). */
  actions?: React.ReactNode;
  /** Faded appearance for expired/revoked entries. */
  dimmed?:  boolean;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  { bg: "#dbeafe", fg: "#1d4ed8" },
  { bg: "#d1fae5", fg: "#065f46" },
  { bg: "#ede9fe", fg: "#5b21b6" },
  { bg: "#fce7f3", fg: "#9d174d" },
  { bg: "#fef9c3", fg: "#78350f" },
  { bg: "#e0e7ff", fg: "#3730a3" },
];

function avatarColor(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export function PersonRow({ name, detail, badge, actions, dimmed = false }: Props) {
  const { bg, fg } = avatarColor(name);

  return (
    <div
      style={{
        display:    "flex",
        alignItems: "center",
        gap:        12,
        padding:    "10px 0",
        opacity:    dimmed ? 0.55 : 1,
      }}
    >
      {/* Avatar */}
      <div
        aria-hidden="true"
        style={{
          width:          36,
          height:         36,
          borderRadius:   "50%",
          background:     bg,
          color:          fg,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          fontSize:       13,
          fontWeight:     700,
          flexShrink:     0,
          letterSpacing:  "0.03em",
        }}
      >
        {initials(name)}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#1c1917", whiteSpace: "nowrap" }}>
            {name}
          </span>
          {badge}
        </div>
        {detail && (
          <div style={{ fontSize: 12, color: "#a8a29e", marginTop: 1 }}>
            {detail}
          </div>
        )}
      </div>
      {actions}
    </div>
  );
}
