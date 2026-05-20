import type { ReactNode } from "react";
import type { FamilySafeShellMode } from "@/components/aihsafe/roles/shellMode";
import type { FlatNode } from "@/components/TreeList";

/** Single contextual rail system — one component, mode-specific content profiles. */
export type ContextRailMode = "dashboard" | "network" | "governance" | "vault";

export type ContextRailMember = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  /** Optional badge: founder, child, business, etc. */
  badge?: string;
  href?: string;
};

export type ContextRailTrustUnit = {
  id: string;
  label: string;
  memberCount: number;
  kind?: "family" | "business" | "other";
};

export type ContextRailPendingInvite = {
  id: string;
  recipientEmail: string;
};

export type DashboardRailProps = {
  flat: FlatNode[];
  totalMembers: number;
  trustUnits: Array<{
    id: string;
    members: { user: { id: string; firstName: string; lastName: string; photoUrl: string | null } }[];
  }>;
  bondPeers: Array<{ id: string; firstName: string; lastName: string; photoUrl: string | null }>;
  currentUserId: string;
};

export type NetworkRailProps = {
  flat: FlatNode[];
  totalMembers: number;
  trustUnits: Array<{
    id: string;
    members: { user: { id: string; firstName: string; lastName: string; photoUrl: string | null } }[];
  }>;
  pendingInvites: ContextRailPendingInvite[];
  currentUserId: string;
};

export type GovernanceRailProps = {
  currentUserId: string;
  shellMode: FamilySafeShellMode;
  isGuardian: boolean;
  canEditGovernance: boolean;
  settingsLabel: string;
  pendingApprovalCount: number;
  pendingInviteCount: number;
  spaceCount: number;
  trustedAdultCount: number;
  members: ContextRailMember[];
  recentActivityHint?: string;
  onOpenSettings: () => void;
  onOpenApprovals: () => void;
  onOpenMembers: () => void;
  onOpenSpaces: () => void;
  onInvite: () => void;
};

export type ContextRailProps = {
  mode: ContextRailMode;
  /** Vault: rail hosts selector + context — children rendered inside. */
  children?: ReactNode;
  className?: string;
};
