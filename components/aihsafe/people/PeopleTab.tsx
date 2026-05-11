"use client";

import { PeopleSection }     from "@/components/aihsafe/people/PeopleSection";
import { PersonRow }         from "@/components/aihsafe/people/PersonRow";
import { RelationshipBadge } from "@/components/aihsafe/people/RelationshipBadge";
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
  onInvite:      () => void;
}

export function PeopleTab({
  currentUserId,
  shellMode,
  trustUnits,
  familyUnits,
  guardianLinks,
  invites,
  loading,
  onInvite,
}: Props) {

  // ── Guardian links where I am the child (my guardians) ──────────────────────
  const myGuardians = guardianLinks.filter(
    (l) => !l.revokedAt && l.childUserId === currentUserId
  );

  // ── Guardian links where I am the guardian (children I supervise) ────────────
  const myChildren = guardianLinks.filter(
    (l) => !l.revokedAt && l.guardianUserId === currentUserId && l.kind !== "trusted_adult"
  );

  // ── Guardian links where I am the guardian, trusted_adult kind ───────────────
  const myTrustedAdults = guardianLinks.filter(
    (l) => !l.revokedAt && l.guardianUserId === currentUserId && l.kind === "trusted_adult"
  );

  // ── Family unit members (excluding self, active only) ────────────────────────
  // Deduplicate across multiple family units; track which units they're in.
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

  // ── Trust unit network members not already categorized above ─────────────────
  const knownIds = new Set(
    [
      currentUserId,
      ...myGuardians.map((l) => l.guardianUserId),
      ...myChildren.map((l) => l.childUserId),
      ...myTrustedAdults.map((l) => l.childUserId),
      ...Array.from(familyMemberIds),
    ]
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

  // ── Pending outgoing invites ─────────────────────────────────────────────────
  const pendingInvites = invites.filter((i) => i.status === "PENDING");

  const totalPeople =
    myGuardians.length +
    myChildren.length +
    myTrustedAdults.length +
    familyMembers.length +
    networkMembers.length;

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

      {/* ── Steward banner (founder only) ──────────────────────────────────── */}
      {shellMode === "founder" && (
        <div
          style={{
            background:   "#faf5ff",
            border:       "1px solid #e9d5ff",
            borderRadius: 16,
            padding:      "16px 22px",
            marginBottom: 14,
            display:      "flex",
            alignItems:   "center",
            gap:          12,
          }}
        >
          <span style={{ fontSize: 22 }} aria-hidden="true">🛡</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#5b21b6" }}>
              You are the network steward
            </div>
            <div style={{ fontSize: 12, color: "#78716c", marginTop: 2 }}>
              You govern who joins, who can approve requests, and how trust is extended.
            </div>
          </div>
        </div>
      )}

      {/* ── My guardians (I am supervised) ─────────────────────────────────── */}
      {myGuardians.length > 0 && (
        <PeopleSection icon="🛡" title="My guardians" count={myGuardians.length}>
          {myGuardians.map((l) => (
            <PersonRow
              key={l.id}
              name={l.guardianName}
              badge={
                <RelationshipBadge
                  kind={l.kind}
                  permissionLevel={l.permissionLevel}
                />
              }
            />
          ))}
        </PeopleSection>
      )}

      {/* ── Children I supervise ─────────────────────────────────────────────── */}
      {myChildren.length > 0 && (
        <PeopleSection icon="👶" title="Children & teens" count={myChildren.length}>
          {myChildren.map((l) => (
            <PersonRow
              key={l.id}
              name={l.childName}
              badge={
                <RelationshipBadge
                  kind={l.kind}
                  permissionLevel={l.permissionLevel}
                />
              }
            />
          ))}
        </PeopleSection>
      )}

      {/* ── Trusted adults I manage ──────────────────────────────────────────── */}
      {myTrustedAdults.length > 0 && (
        <PeopleSection icon="🤝" title="Trusted adults" count={myTrustedAdults.length}>
          {myTrustedAdults.map((l) => (
            <PersonRow
              key={l.id}
              name={l.childName}
              badge={
                <RelationshipBadge
                  kind={l.kind}
                  permissionLevel={l.permissionLevel}
                />
              }
            />
          ))}
        </PeopleSection>
      )}

      {/* ── Family members ─────────────────────────────────────────────────── */}
      {familyMembers.length > 0 && (
        <PeopleSection icon="🏠" title="Family members" count={familyMembers.length}>
          {familyMembers.map(([userId, entry]) => (
            <PersonRow
              key={userId}
              name={entry.name}
              detail={
                entry.unitNames.length > 0
                  ? entry.unitNames.join(", ")
                  : undefined
              }
            />
          ))}
        </PeopleSection>
      )}

      {/* ── Trust unit network ──────────────────────────────────────────────── */}
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

      {/* ── Pending invites ─────────────────────────────────────────────────── */}
      {pendingInvites.length > 0 && (
        <PeopleSection icon="📨" title="Pending invites" count={pendingInvites.length}>
          {pendingInvites.map((inv) => {
            const expiresMs = new Date(inv.expiresAt).getTime() - Date.now();
            const hrs       = Math.floor(expiresMs / 3_600_000);
            const expiry    = expiresMs <= 0 ? "Expired" : hrs > 0 ? `Expires in ${hrs}h` : "Expires soon";
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

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
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
            No people in your network yet
          </p>
          <p style={{ fontSize: 13, color: "#78716c", margin: "0 0 20px", maxWidth: 320, marginInline: "auto" }}>
            Invite trusted family members and friends to build your safe network.
          </p>
          <button
            type="button"
            onClick={onInvite}
            style={{
              display:      "inline-flex",
              alignItems:   "center",
              gap:          8,
              padding:      "10px 20px",
              borderRadius: 11,
              border:       "none",
              background:   "#1c1917",
              color:        "#fff",
              fontWeight:   700,
              fontSize:     13,
              cursor:       "pointer",
            }}
          >
            📨 Invite someone
          </button>
        </div>
      )}

      {/* ── Invite CTA (when there are already people) ───────────────────────── */}
      {totalPeople > 0 && (
        <div style={{ textAlign: "center", paddingTop: 4 }}>
          <button
            type="button"
            onClick={onInvite}
            style={{
              background:   "none",
              border:       "1px solid #e7e5e4",
              borderRadius: 10,
              padding:      "8px 18px",
              fontSize:     13,
              color:        "#57534e",
              fontWeight:   600,
              cursor:       "pointer",
            }}
          >
            📨 Invite someone new
          </button>
        </div>
      )}
    </div>
  );
}
