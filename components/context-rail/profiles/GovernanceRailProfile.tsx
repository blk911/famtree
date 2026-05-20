"use client";

import Link from "next/link";
import { ContextRailSection } from "../ContextRailSection";
import { ContextRailMemberList } from "../ContextRailMemberList";
import { ContextRailQuickActions, type ContextRailAction } from "../ContextRailQuickActions";
import { ContextRailGovernanceCard } from "../ContextRailGovernanceCard";
import type { GovernanceRailProps } from "../types";

function formatInviteWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

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
  membershipCount = 0,
  unreadNotices = 0,
  recentActivityDisplay = "—",
  recentInvites = [],
  members,
  onOpenSettings,
  onOpenApprovals,
  onOpenMembers,
  onOpenSpaces,
  onInvite,
}: GovernanceRailProps) {
  const showApprovals =
    shellMode === "founder" || (shellMode === "member" && isGuardian);
  const childShell = shellMode === "child";
  const needsAttention = pendingApprovalCount + pendingInviteCount;

  const actions: ContextRailAction[] = [];

  if (showApprovals && pendingApprovalCount > 0) {
    actions.push({
      type: "button",
      label: `Review approvals (${pendingApprovalCount})`,
      onClick: onOpenApprovals,
    });
  }

  if (!childShell && pendingInviteCount > 0) {
    actions.push({
      type: "button",
      label: `Pending invites (${pendingInviteCount})`,
      onClick: onOpenMembers,
    });
  }

  if (!childShell && (shellMode === "founder" || isGuardian)) {
    actions.push({ type: "button", label: "Invite someone", onClick: onInvite });
  }

  if (unreadNotices > 0) {
    actions.push({
      type: "link",
      label: `Msg Vault notices (${unreadNotices})`,
      href: "/msg-vault?tab=notices",
    });
  } else {
    actions.push({ type: "link", label: "Open Msg Vault", href: "/msg-vault" });
  }

  return (
    <>
      <ContextRailSection title="Needs attention" count={needsAttention > 0 ? needsAttention : undefined}>
        {needsAttention === 0 ? (
          <p style={{ margin: 0, fontSize: 11, color: "#57534e", lineHeight: 1.45 }}>
            All clear — no pending invites or approvals.
          </p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 11, color: "#57534e" }}>
            {pendingApprovalCount > 0 && (
              <li style={{ padding: "3px 0" }}>
                {pendingApprovalCount} approval{pendingApprovalCount === 1 ? "" : "s"} waiting
              </li>
            )}
            {pendingInviteCount > 0 && (
              <li style={{ padding: "3px 0" }}>
                {pendingInviteCount} invite{pendingInviteCount === 1 ? "" : "s"} outstanding
              </li>
            )}
            {unreadNotices > 0 && (
              <li style={{ padding: "3px 0" }}>{unreadNotices} Msg Vault notice{unreadNotices === 1 ? "" : "s"}</li>
            )}
          </ul>
        )}
      </ContextRailSection>

      {!childShell && (
        <ContextRailSection title="Status">
          <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 11, color: "#57534e" }}>
            <li style={{ padding: "3px 0" }}>
              {pendingInviteCount} pending invite{pendingInviteCount === 1 ? "" : "s"}
            </li>
            <li style={{ padding: "3px 0" }}>
              {recentActivityDisplay} recent activity
            </li>
            {showApprovals && (
              <li style={{ padding: "3px 0" }}>
                {pendingApprovalCount} approval{pendingApprovalCount === 1 ? "" : "s"} waiting
              </li>
            )}
            {unreadNotices > 0 && (
              <li style={{ padding: "3px 0" }}>{unreadNotices} Msg Vault notice{unreadNotices === 1 ? "" : "s"}</li>
            )}
          </ul>
        </ContextRailSection>
      )}

      {!childShell && (
        <ContextRailGovernanceCard
          settingsLabel={settingsLabel}
          shellMode={shellMode}
          canEdit={canEditGovernance}
          pendingApprovals={showApprovals ? pendingApprovalCount : 0}
          items={[
            { label: "Active spaces", value: String(spaceCount) },
            { label: "People in spaces", value: String(membershipCount || members.length) },
            { label: "Trusted adults", value: String(trustedAdultCount) },
          ]}
        />
      )}

      {childShell && (
        <ContextRailSection title="Boundaries">
          <p style={{ fontSize: 11, color: "#57534e", margin: 0, lineHeight: 1.45 }}>
            Msg Rules and boundaries are set by your family steward.
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

      {recentInvites.length > 0 && !childShell && (
        <ContextRailSection title="Recent invites" count={recentInvites.length}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 11, color: "#57534e" }}>
            {recentInvites.map((inv) => (
              <li key={inv.id} style={{ padding: "3px 0" }}>
                {inv.recipientEmail}
                <span style={{ color: "#a8a29e" }}> · {formatInviteWhen(inv.createdAt)}</span>
              </li>
            ))}
          </ul>
        </ContextRailSection>
      )}

      {members.length > 0 && !childShell && (
        <ContextRailSection title="People nearby" count={members.length}>
          <ContextRailMemberList
            members={members.slice(0, 5)}
            currentUserId={currentUserId}
            showChatIcon={false}
            emptyMessage=""
          />
        </ContextRailSection>
      )}

      {actions.length > 0 && (
        <ContextRailSection title="Quick actions">
          <ContextRailQuickActions actions={actions} />
        </ContextRailSection>
      )}

      {!childShell && canEditGovernance && (
        <ContextRailSection title="Msg Rules">
          <p style={{ margin: "0 0 8px", fontSize: 11, color: "#57534e", lineHeight: 1.45 }}>
            Boundaries for minors, invites, and trusted spaces.
          </p>
          <Link href="/aihsafe" onClick={(e) => { e.preventDefault(); onOpenSettings(); }} style={{ fontSize: 11, fontWeight: 600, color: "#6366f1" }}>
            Open {settingsLabel} →
          </Link>
        </ContextRailSection>
      )}
    </>
  );
}
