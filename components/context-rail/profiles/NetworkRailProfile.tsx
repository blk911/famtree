"use client";

import { useRouter } from "next/navigation";
import { ContextRailSection } from "../ContextRailSection";
import { ContextRailMemberList } from "../ContextRailMemberList";
import { ContextRailQuickActions } from "../ContextRailQuickActions";
import type { NetworkRailProps } from "../types";

export function NetworkRailProfile({
  flat,
  totalMembers,
  trustUnits,
  pendingInvites,
  currentUserId,
}: NetworkRailProps) {
  const router = useRouter();

  const members = flat.slice(0, 8).map((n) => {
    const m = n.member;
    let badge: string | undefined;
    if (m.role === "founder" || m.role === "admin") badge = "Steward";
    else if (m.profile?.familyRole === "child") badge = "Family";
    return {
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      photoUrl: m.photoUrl,
      badge,
      href: m.id === currentUserId ? undefined : `/profile/${m.id}`,
    };
  });

  return (
    <>
      <ContextRailSection title="Family" count={totalMembers}>
        <ContextRailMemberList
          members={members}
          currentUserId={currentUserId}
          showChatIcon={false}
          emptyMessage="No family members yet — send an invite."
        />
      </ContextRailSection>

      {trustUnits.length > 0 && (
        <ContextRailSection title="Trust circles" count={trustUnits.length}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 11, color: "#57534e" }}>
            {trustUnits.slice(0, 5).map((unit) => (
              <li key={unit.id} style={{ padding: "4px 0", borderBottom: "1px solid #f5f4f0" }}>
                🤝 {unit.members.map((m) => m.user.firstName).join(", ")}
                <span style={{ color: "#a8a29e" }}> ({unit.members.length})</span>
              </li>
            ))}
          </ul>
        </ContextRailSection>
      )}

      {pendingInvites.length > 0 && (
        <ContextRailSection title="Pending invites" count={pendingInvites.length} href="/invite">
          <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 11, color: "#57534e" }}>
            {pendingInvites.slice(0, 4).map((inv) => (
              <li key={inv.id} style={{ padding: "3px 0" }}>
                {inv.recipientEmail}
              </li>
            ))}
          </ul>
        </ContextRailSection>
      )}

      <ContextRailSection title="Quick actions">
        <ContextRailQuickActions
          actions={[
            { type: "link", label: "Open Msg Vault", href: "/msg-vault" },
            { type: "link", label: "Invite someone", href: "/invite" },
            { type: "link", label: "Family Safe", href: "/aihsafe" },
            {
              type: "button",
              label: "Message someone…",
              onClick: () => router.push("/msg-vault"),
            },
          ]}
        />
      </ContextRailSection>
    </>
  );
}
