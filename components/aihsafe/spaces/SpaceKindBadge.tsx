import React from "react";

type SpaceKind = "family" | "peer" | "extended" | "guardian";

const KIND_META: Record<SpaceKind, { label: string; icon: string; bg: string; color: string }> = {
  family:   { label: "Family",   icon: "🏠", bg: "#eff6ff", color: "#1d4ed8" },
  peer:     { label: "Peer",     icon: "🤝", bg: "#f5f3ff", color: "#6d28d9" },
  extended: { label: "Extended", icon: "🌐", bg: "#f0f9ff", color: "#0369a1" },
  guardian: { label: "Guardian", icon: "🛡", bg: "#f0fdf4", color: "#065f46" },
};

const FALLBACK = { label: "Space", icon: "◆", bg: "#f4f4f5", color: "#52525b" };

interface Props {
  kind: string;
  /** Show icon only, no label text. */
  iconOnly?: boolean;
}

export function SpaceKindBadge({ kind, iconOnly = false }: Props) {
  const meta = KIND_META[kind as SpaceKind] ?? FALLBACK;

  return (
    <span
      style={{
        display:      "inline-flex",
        alignItems:   "center",
        gap:          3,
        background:   meta.bg,
        color:        meta.color,
        fontSize:     10,
        fontWeight:   700,
        borderRadius: 6,
        padding:      iconOnly ? "2px 6px" : "2px 8px",
        whiteSpace:   "nowrap",
      }}
    >
      <span aria-hidden="true">{meta.icon}</span>
      {!iconOnly && meta.label}
    </span>
  );
}

export function kindIcon(kind: string): string {
  return KIND_META[kind as SpaceKind]?.icon ?? "◆";
}
