import type { VaultSpaceType } from "@/lib/aihsafe/vault-space";

/** User-facing space categories for the creation wizard (Agent 86). */
export const TRUSTED_SPACE_CREATION_TYPES = [
  { id: "family",        label: "Family",        vaultSpaceType: "FAMILY" as VaultSpaceType,   hint: "Household and relatives" },
  { id: "peer",          label: "Peer",          vaultSpaceType: "CUSTOM" as VaultSpaceType,   hint: "Friends and close circles" },
  { id: "work",          label: "Work",          vaultSpaceType: "BUSINESS" as VaultSpaceType, hint: "Colleagues and work pod" },
  { id: "guardian",      label: "Guardian",      vaultSpaceType: "PRIVATE" as VaultSpaceType,  hint: "Care and supervision" },
  { id: "private_group", label: "Private Group", vaultSpaceType: "CLUB" as VaultSpaceType,     hint: "Small private group" },
] as const;

export type TrustedSpaceCreationTypeId = (typeof TRUSTED_SPACE_CREATION_TYPES)[number]["id"];

export const SPACE_NAME_EXAMPLES = ["Soccer Parents", "My House", "Work Pod"];
