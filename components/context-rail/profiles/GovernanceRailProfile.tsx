"use client";

import { ContextRailSection } from "../ContextRailSection";
import { ContextRailMemberList } from "../ContextRailMemberList";
import { ContextRailQuickActions, type ContextRailAction } from "../ContextRailQuickActions";
import { ContextRailGovernanceCard } from "../ContextRailGovernanceCard";
import { ContextRailActivityCard } from "../ContextRailActivityCard";
import type { GovernanceRailProps } from "../types";

export function GovernanceRailProfile({
  currentUserId,
  shellMode,
  isGuardian,
  canEditGovernance,
  settingsLabel,
  pendingApprovalCount,
  pendingInviteCount,
  spaceCount,
  trustedAdultCount,
  members,
  recentActivityHint = "Activity and approvals stay in the center panel.",
  onOpenSettings,
  onOpenApprovals,
  onOpenMembers,
  onOpenSpaces,
  onInvite,
}: GovernanceRailProps) {
  const showApprovals =
    shellMode === "founder" || (shellMode === "member" && isGuardian);
  const childShell = shellMode === "child";

  const actions: ContextRailAction[] = [
    { type: "link", label: "Msg Vault", href: "/msg-vault" },
    { type: "link", label: "My Network", href: "/tree" },
  ];
  if (!childShell) {
    actions.unshift({
      type: "button",
      label: `Open ${settingsLabel}`,
      onClick: onOpenSettings,
    });
  }
  if (showApprovals && pendingApprovalCount > 0) {
    actions.unshift({
      type: "button",
      label: `Review approvals (${pendingApprovalCount})`,
      onClick: onOpenApprovals,
    });
  }
  if (!childShell) {
    actions.push({ type: "button", label: "View people", onClick: onOpenMembers });
    actions.push({ type: "button", label: "View spaces", onClick: onOpenSpaces });
    if (shellMode === "founder" || isGuardian) {
      actions.push({ type: "button", label: "Invite someone", onClick: onInvite });
    }
  }

  return (
    <>
      {!childShell && (
        <ContextRailGovernanceCard
          settingsLabel={settingsLabel}
          shellMode={shellMode}
          canEdit={canEditGovernance}
          pendingApprovals={showApprovals ? pendingApprovalCount : 0}
          items={[
            { label: "Spaces", value: String(spaceCount) },
            { label: "Trusted adults", value: String(trustedAdultCount) },
            ...(pendingInviteCount > 0
              ? [{ label: "Pending invites", value: String(pendingInviteCount) }]
              : []),
          ]}
        />
      )}

      {childShell && (
        <ContextRailSection title="Boundaries">
          <p style={{ fontSize: 11, color: "#57534e", margin: 0, lineHeight: 1.45 }}>
            Your family steward manages Boundaries. You can view them under the Boundaries tab.
          </p>
          <button
            type="button"
            onClick={onOpenSettings}
            style={{
              marginTop: 8,
              background: "none",
              border: "none",
              padding: 0,
              fontSize: 11,
              fontWeight: 600,
              color: "#6366f1",
              cursor: "pointer",
            }}
          >
            View Boundaries →
          </button>
        </ContextRailSection>
      )}

      {members.length > 0 && !childShell && (
        <ContextRailSection title="Family members" count={members.length}>
          <ContextRailMemberList
            members={members.slice(0, 6)}
            currentUserId={currentUserId}
            showChatIcon={false}
            emptyMessage=""
          />
        </ContextRailSection>
      )}

      <ContextRailActivityCard hint={recentActivityHint} onSeeActivity={onOpenSpaces} />

      <ContextRailSection title="Quick actions">
        <ContextRailQuickActions actions={actions} />
      </ContextRailSection>
    </>
  );
}
