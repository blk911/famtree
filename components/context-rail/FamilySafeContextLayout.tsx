"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import type { TrustUnitDTO } from "@/types/aihsafe/dto";
import type { FamilySafeShellMode } from "@/components/aihsafe/roles/shellMode";
import { canEditFamilyGovernance, settingsTabLabel } from "@/components/aihsafe/roles/governanceView";
import { getActiveTrustUnits } from "@/lib/trust/display";
import { ContextRail } from "./ContextRail";
import { GovernanceRailProfile } from "./profiles/GovernanceRailProfile";
import type { ContextRailMember } from "./types";
import type { TabId } from "@/components/aihsafe/navigation/FamilySafeTabs";

export function FamilySafeContextLayout({
  children,
  currentUserId,
  shellMode,
  systemRole,
  isGuardian,
  trustUnits,
  pendingApprovalCount,
  pendingInviteCount,
  spaceCount,
  trustedAdultCount,
  onTabChange,
  onInvite,
}: {
  children: ReactNode;
  currentUserId: string;
  shellMode: FamilySafeShellMode;
  systemRole: string;
  isGuardian: boolean;
  trustUnits: TrustUnitDTO[];
  pendingApprovalCount: number;
  pendingInviteCount: number;
  spaceCount: number;
  trustedAdultCount: number;
  onTabChange: (tab: TabId) => void;
  onInvite: () => void;
}) {
  const activeTrustUnits = useMemo(
    () => getActiveTrustUnits(trustUnits, currentUserId),
    [trustUnits, currentUserId],
  );

  const members = useMemo(() => {
    const seen = new Set<string>();
    const out: ContextRailMember[] = [];
    for (const tu of activeTrustUnits) {
      for (const m of tu.members) {
        if (m.exitedAt || seen.has(m.userId)) continue;
        seen.add(m.userId);
        const parts = m.displayName.trim().split(/\s+/);
        out.push({
          id:        m.userId,
          firstName: parts[0] ?? m.displayName,
          lastName:  parts.slice(1).join(" ") || "",
          photoUrl:  null,
        });
      }
    }
    return out;
  }, [activeTrustUnits]);

  const settingsLabel = settingsTabLabel(shellMode);

  return (
    <div className="app-page-body thread-hub-grid aihsafe-context-layout">
      <div className="thread-hub-grid__main">{children}</div>
      <div className="thread-hub-grid__rail">
        <ContextRail mode="governance">
          <GovernanceRailProfile
            currentUserId={currentUserId}
            shellMode={shellMode}
            isGuardian={isGuardian}
            canEditGovernance={canEditFamilyGovernance(shellMode, systemRole)}
            settingsLabel={settingsLabel}
            pendingApprovalCount={pendingApprovalCount}
            pendingInviteCount={pendingInviteCount}
            spaceCount={spaceCount}
            trustedAdultCount={trustedAdultCount}
            members={members}
            onOpenSettings={() => onTabChange("settings")}
            onOpenApprovals={() => onTabChange("approvals")}
            onOpenMembers={() => onTabChange("members")}
            onOpenSpaces={() => onTabChange("spaces")}
            onInvite={onInvite}
          />
        </ContextRail>
      </div>
    </div>
  );
}
