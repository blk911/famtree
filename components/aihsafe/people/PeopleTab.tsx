"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PeopleSection }     from "@/components/aihsafe/people/PeopleSection";
import { PersonRow }         from "@/components/aihsafe/people/PersonRow";
import { RelationshipBadge } from "@/components/aihsafe/people/RelationshipBadge";
import { GuardianLinkModal, type GuardianLinkModalMode } from "@/components/aihsafe/people/GuardianLinkModal";
import { RevokeLinkButton }  from "@/components/aihsafe/people/LinkRowActions";
import { buildMemberCandidates } from "@/components/aihsafe/people/memberCandidates";
import type {
  FamilyUnitDTO,
  TrustUnitDTO,
  GuardianLinkDTO,
  InviteDTO,
} from "@/types/aihsafe/dto";
import type { FamilySafeShellMode } from "@/components/aihsafe/founder/FounderShell";

interface Props {
  currentUserId: string;
  shellMode:     FamilySafeShellMode;
  trustUnits:    TrustUnitDTO[];
  familyUnits:   FamilyUnitDTO[];
  guardianLinks: GuardianLinkDTO[];
  invites:       InviteDTO[];
  loading:       boolean;
  onReload?:     () => void;
}

const actionBtnStyle: React.CSSProperties = {
  display:      "inline-flex",
  alignItems:   "center",
  gap:          6,
  padding:      "8px 14px",
  borderRadius: 10,
  border:       "1px solid #e7e5e4",
  background:   "#fff",
  fontSize:     12,
  fontWeight:   700,
  color:        "#44403c",
  cursor:       "pointer",
};

const primaryBtnStyle: React.CSSProperties = {
  ...actionBtnStyle,
  background: "#1c1917",
  color:      "#fff",
  border:     "none",
};

function linkDetail(link: GuardianLinkDTO, perspective: "guardian" | "child"): string {
  const other =
    perspective === "guardian" ? link.childName : link.guardianName;
  return perspective === "guardian"
    ? `You support ${other}`
    : `${other} supports you`;
}

export function PeopleTab({
  currentUserId,
  shellMode,
  trustUnits,
  familyUnits,
  guardianLinks,
  invites,
  loading,
  onReload,
}: Props) {
  const [linkModal, setLinkModal] = useState<GuardianLinkModalMode | null>(null);

  const activeLinks = guardianLinks.filter((l) => !l.revokedAt);

  const myGuardians = activeLinks.filter((l) => l.childUserId === currentUserId);

  const myChildren = activeLinks.filter(
    (l) => l.guardianUserId === currentUserId && l.kind !== "trusted_adult",
  );

  const myTrustedAdults = activeLinks.filter(
    (l) => l.guardianUserId === currentUserId && l.kind === "trusted_adult",
  );

  const isGuardian =
    myChildren.length > 0 || myTrustedAdults.length > 0;

  const canManageLinks = shellMode === "founder";

  const linkedChildIds = useMemo(
    () =>
      new Set(
        activeLinks
          .filter((l) => l.guardianUserId === currentUserId)
          .map((l) => l.childUserId),
      ),
    [activeLinks, currentUserId],
  );

  const candidates = useMemo(
    () => buildMemberCandidates(currentUserId, trustUnits, familyUnits),
    [currentUserId, trustUnits, familyUnits],
  );

  // Family-unit roles (directory — not the same as guardian-link records)
  const familyStewards = useMemo(() => {
    const map = new Map<string, { name: string; unitNames: string[] }>();
    for (const fu of familyUnits) {
      if (fu.status === "dissolved") continue;
      for (const m of fu.members) {
        if (m.exitedAt || m.role !== "guardian" || m.userId === currentUserId) continue;
        if (!map.has(m.userId)) {
          map.set(m.userId, { name: m.displayName, unitNames: [] });
        }
        map.get(m.userId)!.unitNames.push(fu.name);
      }
    }
    return Array.from(map.entries());
  }, [familyUnits, currentUserId]);

  const familyMemberIds = new Set<string>();
  const familyMemberMap = new Map<string, { name: string; role: string; unitNames: string[] }>();
  for (const fu of familyUnits) {
    for (const m of fu.members) {
      if (m.userId === currentUserId || m.exitedAt) continue;
      familyMemberIds.add(m.userId);
      if (!familyMemberMap.has(m.userId)) {
        familyMemberMap.set(m.userId, { name: m.displayName, role: m.role, unitNames: [] });
      }
      familyMemberMap.get(m.userId)!.unitNames.push(fu.name);
    }
  }

  const knownIds = new Set(
    [
      currentUserId,
      ...myGuardians.map((l) => l.guardianUserId),
      ...myChildren.map((l) => l.childUserId),
      ...myTrustedAdults.map((l) => l.childUserId),
      ...familyStewards.map(([id]) => id),
      ...Array.from(familyMemberIds),
    ],
  );

  const networkMemberMap = new Map<string, { name: string; spaceNames: string[] }>();
  for (const tu of trustUnits) {
    for (const m of tu.members) {
      if (knownIds.has(m.userId) || m.exitedAt) continue;
      if (!networkMemberMap.has(m.userId)) {
        networkMemberMap.set(m.userId, { name: m.displayName, spaceNames: [] });
      }
      networkMemberMap.get(m.userId)!.spaceNames.push(tu.name ?? tu.kind);
    }
  }

  const networkMembers = Array.from(networkMemberMap.entries());
  const familyMembers  = Array.from(familyMemberMap.entries());
  const pendingInvites = invites.filter((i) => i.status === "PENDING");

  const totalPeople =
    myGuardians.length +
    myChildren.length +
    myTrustedAdults.length +
    familyStewards.length +
    familyMembers.length +
    networkMembers.length;

  function renderGuardianLinkRow(
    link: GuardianLinkDTO,
    nameField: "childName" | "guardianName",
    perspective: "guardian" | "child",
  ) {
    return (
      <PersonRow
        key={link.id}
        name={link[nameField]}
        detail={linkDetail(link, perspective)}
        badge={
          <RelationshipBadge kind={link.kind} permissionLevel={link.permissionLevel} />
        }
        actions={canManageLinks ? <RevokeLinkButton /> : undefined}
      />
    );
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 680 }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              background:   "#fff",
              borderRadius: 16,
              border:       "1px solid #e7e5e4",
              padding:      "18px 22px",
              marginBottom: 14,
            }}
          >
            <div style={{ height: 14, width: "40%", background: "#f3f4f6", borderRadius: 6, marginBottom: 12 }} />
            <div style={{ height: 36, background: "#f9fafb", borderRadius: 8 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680 }}>

      {shellMode === "founder" && (
        <div
          style={{
            background:   "#faf5ff",
            border:       "1px solid #e9d5ff",
            borderRadius: 16,
            padding:      "16px 22px",
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span style={{ fontSize: 22 }} aria-hidden="true">🛡</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#5b21b6" }}>
                Family steward
              </div>
              <div style={{ fontSize: 12, color: "#78716c", marginTop: 2, lineHeight: 1.5 }}>
                You help your family decide who is in each approved circle, who can approve
                requests, and how trusted adults participate.
              </div>
            </div>
          </div>
        </div>
      )}

      {shellMode === "member" && isGuardian && (
        <div
          style={{
            background:   "#f0fdf4",
            border:       "1px solid #bbf7d0",
            borderRadius: 16,
            padding:      "14px 18px",
            marginBottom: 14,
            fontSize:     13,
            color:        "#166534",
            lineHeight:   1.5,
          }}
        >
          You support people in your approved circle. Review pending items in the{" "}
          <strong>Approvals</strong> tab when someone needs your sign-off.
        </div>
      )}

      {canManageLinks && (
        <div
          style={{
            display:    "flex",
            flexWrap:   "wrap",
            gap:        8,
            marginBottom: 14,
          }}
        >
          <button
            type="button"
            style={primaryBtnStyle}
            onClick={() => setLinkModal("guardian")}
          >
            Connect as guardian
          </button>
          <button
            type="button"
            style={actionBtnStyle}
            onClick={() => setLinkModal("trusted_adult")}
          >
            Add trusted adult
          </button>
        </div>
      )}

      {myChildren.length > 0 && (
        <PeopleSection
          icon="👶"
          title="Children & teens in your care"
          count={myChildren.length}
          emptyText="No children or teens linked to you yet."
        >
          {myChildren.map((l) => renderGuardianLinkRow(l, "childName", "guardian"))}
        </PeopleSection>
      )}

      {canManageLinks && myChildren.length === 0 && (
        <PeopleSection
          icon="👶"
          title="Children & teens in your care"
          emptyText="Connect as a guardian when someone in your approved circle needs your support."
        />
      )}

      {myTrustedAdults.length > 0 && (
        <PeopleSection
          icon="🤝"
          title="Trusted adults"
          count={myTrustedAdults.length}
        >
          {myTrustedAdults.map((l) => renderGuardianLinkRow(l, "childName", "guardian"))}
        </PeopleSection>
      )}

      {myGuardians.length > 0 && (
        <PeopleSection icon="🛡" title="Your guardians" count={myGuardians.length}>
          {myGuardians.map((l) => renderGuardianLinkRow(l, "guardianName", "child"))}
        </PeopleSection>
      )}

      {familyStewards.length > 0 && (
        <PeopleSection
          icon="🏡"
          title="Family stewards"
          count={familyStewards.length}
        >
          {familyStewards.map(([userId, entry]) => (
            <PersonRow
              key={userId}
              name={entry.name}
              detail={entry.unitNames.join(", ")}
              badge={
                <span
                  style={{
                    fontSize:     10,
                    fontWeight:   600,
                    color:        "#5b21b6",
                    background:   "#faf5ff",
                    borderRadius: 6,
                    padding:      "2px 7px",
                  }}
                >
                  Steward
                </span>
              }
            />
          ))}
        </PeopleSection>
      )}

      {familyMembers.length > 0 && (
        <PeopleSection icon="🏠" title="Family members" count={familyMembers.length}>
          {familyMembers.map(([userId, entry]) => (
            <PersonRow
              key={userId}
              name={entry.name}
              detail={
                entry.unitNames.length > 0 ? entry.unitNames.join(", ") : undefined
              }
              badge={
                entry.role === "child" ? (
                  <span
                    style={{
                      fontSize:     10,
                      fontWeight:   600,
                      color:        "#0369a1",
                      background:   "#f0f9ff",
                      borderRadius: 6,
                      padding:      "2px 7px",
                    }}
                  >
                    Family
                  </span>
                ) : undefined
              }
            />
          ))}
        </PeopleSection>
      )}

      {networkMembers.length > 0 && (
        <PeopleSection icon="🌐" title="Network members" count={networkMembers.length}>
          {networkMembers.map(([userId, entry]) => (
            <PersonRow
              key={userId}
              name={entry.name}
              detail={
                entry.spaceNames.length > 0
                  ? `Shared: ${entry.spaceNames.join(", ")}`
                  : undefined
              }
            />
          ))}
        </PeopleSection>
      )}

      {pendingInvites.length > 0 && (
        <PeopleSection icon="📨" title="Pending invites" count={pendingInvites.length}>
          {pendingInvites.map((inv) => {
            const expiresMs = new Date(inv.expiresAt).getTime() - Date.now();
            const hrs       = Math.floor(expiresMs / 3_600_000);
            const expiry    =
              expiresMs <= 0 ? "Expired" : hrs > 0 ? `Expires in ${hrs}h` : "Expires soon";
            return (
              <PersonRow
                key={inv.id}
                name={inv.recipientEmail}
                detail={`${inv.relationship} · ${expiry}`}
                dimmed={expiresMs <= 0}
              />
            );
          })}
        </PeopleSection>
      )}

      {totalPeople === 0 && pendingInvites.length === 0 && (
        <div
          style={{
            background:   "#fff",
            borderRadius: 16,
            border:       "1px solid #e7e5e4",
            padding:      "36px 24px",
            textAlign:    "center",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
          <p style={{ fontWeight: 700, fontSize: 15, color: "#1c1917", margin: "0 0 6px" }}>
            Your approved circle is just getting started
          </p>
          <p style={{ fontSize: 13, color: "#78716c", margin: "0 0 20px", maxWidth: 320, marginInline: "auto" }}>
            Invite trusted family and friends, then connect guardian and trusted-adult links here.
          </p>
          <Link href="/invite" style={{ ...primaryBtnStyle, textDecoration: "none" }}>
            Invite someone
          </Link>
        </div>
      )}

      {totalPeople > 0 && (
        <div style={{ textAlign: "center", paddingTop: 4 }}>
          <Link
            href="/invite"
            style={{
              ...actionBtnStyle,
              textDecoration: "none",
              display:      "inline-block",
            }}
          >
            Invite someone new
          </Link>
        </div>
      )}

      {linkModal && (
        <GuardianLinkModal
          mode={linkModal}
          candidates={candidates}
          linkedChildIds={linkedChildIds}
          onClose={() => setLinkModal(null)}
          onCreated={() => onReload?.()}
        />
      )}
    </div>
  );
}
