// Msg Vault — space category labels (API + UI).

import type { TrustUnitKind } from "@/types/aihsafe/trust-units";

export type VaultSpaceType =
  | "FAMILY"
  | "BUSINESS"
  | "CHURCH"
  | "CLUB"
  | "PRIVATE"
  | "CUSTOM";

export const VAULT_SPACE_TYPES: readonly VaultSpaceType[] = [
  "FAMILY",
  "BUSINESS",
  "CHURCH",
  "CLUB",
  "PRIVATE",
  "CUSTOM",
] as const;

const SHORT: Record<VaultSpaceType, string> = {
  FAMILY:   "Family",
  BUSINESS: "Business",
  CHURCH:   "Church",
  CLUB:     "Club",
  PRIVATE:  "Private",
  CUSTOM:   "Custom",
};

/** Dropdown / badge label */
export function vaultSpaceTypeShortLabel(t: VaultSpaceType): string {
  return SHORT[t];
}

/** Card header line, e.g. "Business Space" */
export function vaultSpaceTypeHeaderLabel(t: VaultSpaceType): string {
  return `${SHORT[t]} Space`;
}

/** Activity line, e.g. "Shared in Business" */
export function vaultSharedInLabel(t: VaultSpaceType): string {
  return `Shared in ${SHORT[t]}`;
}

/** Backfill vault category from legacy AIH trust-unit kind when DB field is null. */
export function deriveVaultSpaceTypeFromTrustKind(kind: TrustUnitKind): VaultSpaceType {
  switch (kind) {
    case "family":
      return "FAMILY";
    case "extended":
      return "CLUB";
    case "guardian":
      return "PRIVATE";
    default:
      return "CUSTOM";
  }
}

/** Stored AIH sidecar kind — governance compat; separate from vault-facing category. */
export function vaultSpaceTypeToAihMetaKind(
  vt: VaultSpaceType,
): "family" | "peer" | "extended" | "guardian" {
  switch (vt) {
    case "FAMILY":
      return "family";
    case "CLUB":
    case "CHURCH":
      return "extended";
    case "PRIVATE":
      return "guardian";
    default:
      return "peer";
  }
}
