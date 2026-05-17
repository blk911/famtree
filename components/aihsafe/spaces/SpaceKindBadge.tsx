import React from "react";
import type { VaultSpaceType } from "@/lib/aihsafe/vault-space";
import { vaultSpaceTypeShortLabel } from "@/lib/aihsafe/vault-space";

type LegacyKind = "family" | "peer" | "extended" | "guardian";

const KIND_META: Record<LegacyKind, { label: string; icon: string; bg: string; color: string }> = {
  family:   { label: "Family",   icon: "🏠", bg: "#eff6ff", color: "#1d4ed8" },
  peer:     { label: "Peer",       icon: "🤝", bg: "#f5f3ff", color: "#6d28d9" },
  extended: { label: "Extended",   icon: "🌐", bg: "#f0f9ff", color: "#0369a1" },
  guardian: { label: "Guardian",   icon: "🛡", bg: "#f0fdf4", color: "#065f46" },
};

const VAULT_META: Record<VaultSpaceType, { icon: string; bg: string; color: string }> = {
  FAMILY:   { icon: "🏠", bg: "#eff6ff", color: "#1d4ed8" },
  BUSINESS: { icon: "💼", bg: "#f8fafc", color: "#0f172a" },
  CHURCH:   { icon: "⛪", bg: "#fefce8", color: "#a16207" },
  CLUB:     { icon: "⚽", bg: "#f0fdf4", color: "#15803d" },
  PRIVATE:  { icon: "🔒", bg: "#faf5ff", color: "#7c3aed" },
  CUSTOM:   { icon: "✦", bg: "#f4f4f5", color: "#52525b" },
};

const FALLBACK = { label: "Space", icon: "◆", bg: "#f4f4f5", color: "#52525b" };

interface Props {
  kind: string;
  /** When set (Msg Vault), overrides legacy kind chip styling/labels. */
  vaultSpaceType?: VaultSpaceType | string | null;
  iconOnly?: boolean;
}

export function SpaceKindBadge({ kind, vaultSpaceType, iconOnly = false }: Props) {
  const vt = vaultSpaceType as VaultSpaceType | undefined;

  let icon: string;
  let label: string;
  let bg: string;
  let color: string;

  if (vt && vt in VAULT_META) {
    const vm = VAULT_META[vt];
    icon  = vm.icon;
    bg    = vm.bg;
    color = vm.color;
    label = vaultSpaceTypeShortLabel(vt);
  } else {
    const lm = KIND_META[kind as LegacyKind] ?? FALLBACK;
    icon  = lm.icon;
    bg    = lm.bg;
    color = lm.color;
    label = lm.label;
  }

  return (
    <span
      style={{
        display:      "inline-flex",
        alignItems:   "center",
        gap:          3,
        background:   bg,
        color:        color,
        fontSize:     10,
        fontWeight:   700,
        borderRadius: 6,
        padding:      iconOnly ? "2px 6px" : "2px 8px",
        whiteSpace:   "nowrap",
      }}
    >
      <span aria-hidden="true">{icon}</span>
      {!iconOnly && label}
    </span>
  );
}

export function kindIcon(kind: string): string {
  return KIND_META[kind as LegacyKind]?.icon ?? "◆";
}
