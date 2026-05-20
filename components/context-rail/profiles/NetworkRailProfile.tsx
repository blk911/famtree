"use client";

import { useRouter } from "next/navigation";
import { ContextRailSection } from "../ContextRailSection";
import { ContextRailMemberList } from "../ContextRailMemberList";
import { ContextRailQuickActions } from "../ContextRailQuickActions";
import { ContextRailTrustCirclesSection } from "../ContextRailTrustCirclesSection";
import {
  countDraftTrustUnits,
  getActiveTrustUnits,
} from "@/lib/trust/display";
import type { NetworkRailProps } from "../types";

export function NetworkRailProfile({
  flat,
  totalMembers,
  trustUnits,
  pendingInvites,
  currentUserId,
}: NetworkRailProps) {
  const router = useRouter();
  const activeTrustUnits = getActiveTrustUnits(trustUnits, currentUserId);
  const draftTrustCount = countDraftTrustUnits(trustUnits, currentUserId);

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

      <ContextRailTrustCirclesSection
        activeUnits={activeTrustUnits.slice(0, 5).map((unit) => ({
          id: unit.id,
          label: unit.members.map((m) => m.user.firstName).join(", "),
          memberCount: unit.members.length,
        }))}
        draftCount={draftTrustCount}
        showDraftInRail={activeTrustUnits.length === 0 && draftTrustCount > 0}
      />

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
