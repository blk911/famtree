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

/**
 * Agent 92 — target Space creation menu (not all options wired in UI yet).
 * Published Studio → governed TrustUnit/FamilyUnit + branded `/studios/[slug]` layer.
 */
export const SPACE_PLATFORM_CREATION_OPTIONS = [
  { id: "private_space",     label: "Private Space",     wired: true,  wizard: "trusted_space" },
  { id: "family_group",      label: "Family Group",      wired: true,  wizard: "family_group" },
  { id: "client_network",    label: "Client Network",    wired: false, mapsTo: "BUSINESS" },
  { id: "learning_space",    label: "Learning Space",    wired: false, mapsTo: "CLUB" },
  { id: "executive_room",    label: "Executive Room",    wired: false, mapsTo: "PRIVATE" },
  { id: "published_studio",  label: "Published Studio", wired: "bridge", href: "/studios/start" },
] as const;
