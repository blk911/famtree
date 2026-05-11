"use client";

import { useState, useCallback } from "react";
import { SpaceCard }             from "@/components/aihsafe/spaces/SpaceCard";
import { SpacesSection }         from "@/components/aihsafe/spaces/SpacesSection";
import { exitMembership }        from "@/components/aihsafe/common/apiClient";
import type {
  FamilyUnitDTO,
  TrustUnitDTO,
  InviteDTO,
} from "@/types/aihsafe/dto";
import type { FamilySafeShellMode } from "@/components/aihsafe/founder/FounderShell";

// ─── Data limitation note ──────────────────────────────────────────────────────
// TrustUnitMember.role is always "member" (Phase 4 schema gap; see service-boundaries.md).
// Creator detection for trust units is not possible. Only FamilyUnitDTO.createdByUserId
// is available to mark family group founders.

interface Props {
  currentUserId: string;
  shellMode:     FamilySafeShellMode;
  trustUnits:    TrustUnitDTO[];
  familyUnits:   FamilyUnitDTO[];
  invites:       InviteDTO[];
  loading:       boolean;
  onCreateSpace:  () => void;
  onCreateFamily: () => void;
  onInvite:       () => void;
  onReload:       () => void;
}

const newBtn = (onClick: () => void) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      background:   "transparent",
      border:       "1px solid #e7e5e4",
      borderRadius: 8,
      padding:      "4px 12px",
      fontSize:     12,
      fontWeight:   600,
      color:        "#44403c",
      cursor:       "pointer",
    }}
  >
    + New
  </button>
);

const emptyCreateBtn = (label: string, onClick: () => void) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      display:      "inline-flex",
      alignItems:   "center",
      gap:          6,
      background:   "transparent",
      border:       "1px dashed #d6d3d1",
      borderRadius: 9,
      padding:      "8px 16px",
      fontSize:     13,
      fontWeight:   600,
      color:        "#78716c",
      cursor:       "pointer",
    }}
  >
    {label}
  </button>
);

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <>
      {[1, 2].map(i => (
        <div
          key={i}
          style={{
            background:   "#fff",
            borderRadius: 14,
            border:       "1px solid #e7e5e4",
            padding:      "16px 18px",
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: "#f3f4f6", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 14, width: "50%", background: "#f3f4f6", borderRadius: 6, marginBottom: 6 }} />
              <div style={{ height: 11, width: "30%", background: "#f9fafb", borderRadius: 6 }} />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ─── Pending invite row ───────────────────────────────────────────────────────

function PendingInviteRow({ invite }: { invite: InviteDTO }) {
  const expiresMs = new Date(invite.expiresAt).getTime() - Date.now();
  const hrs       = Math.floor(expiresMs / 3_600_000);
  const expired   = expiresMs <= 0;
  const expiry    = expired ? "Expired" : hrs > 0 ? `Expires in ${hrs}h` : "Expires soon";

  return (
    <div
      style={{
        background:   "#fff",
        borderRadius: 14,
        border:       "1px solid #e7e5e4",
        padding:      "14px 18px",
        marginBottom: 10,
        opacity:      expired ? 0.55 : 1,
        display:      "flex",
        alignItems:   "center",
        gap:          12,
      }}
    >
      <span style={{ fontSize: 20, flexShrink: 0 }} aria-hidden="true">📨</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight:   600,
            fontSize:     14,
            color:        "#1c1917",
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
          }}
        >
          {invite.recipientEmail}
        </div>
        <div style={{ fontSize: 12, color: "#a8a29e", marginTop: 2 }}>
          {invite.relationship} · {expiry}
        </div>
      </div>
      <span
        style={{
          fontSize:     10,
          fontWeight:   700,
          color:        expired ? "#dc2626" : "#d97706",
          background:   expired ? "#fee2e2" : "#fef9c3",
          borderRadius: 6,
          padding:      "2px 8px",
          whiteSpace:   "nowrap",
          flexShrink:   0,
        }}
      >
        {expired ? "Expired" : "Pending"}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SpacesTab({
  currentUserId,
  shellMode,
  trustUnits,
  familyUnits,
  invites,
  loading,
  onCreateSpace,
  onCreateFamily,
  onInvite,
  onReload,
}: Props) {
  const [exitingId,  setExitingId]  = useState<string | null>(null);
  const [exitErrors, setExitErrors] = useState<Record<string, string>>({});

  const handleLeave = useCallback(async (membershipId: string) => {
    setExitingId(membershipId);
    setExitErrors(e => { const c = { ...e }; delete c[membershipId]; return c; });
    const r = await exitMembership(membershipId);
    setExitingId(null);
    if (r.kind === "ok") {
      onReload();
    } else {
      const msg = r.kind === "error" ? r.message
        : r.kind === "denied" ? r.message
        : "Couldn't leave that space right now.";
      setExitErrors(e => ({ ...e, [membershipId]: msg }));
    }
  }, [onReload]);

  // ── Active trust units for current user ───────────────────────────────────
  const myTrustUnits = trustUnits.filter(u =>
    u.members.some(m => m.userId === currentUserId && !m.exitedAt)
  );

  // ── Family units for current user ─────────────────────────────────────────
  const myFamilyUnits = familyUnits.filter(u =>
    u.status !== "dissolved" &&
    u.members.some(m => m.userId === currentUserId && !m.exitedAt)
  );

  // ── Pending outgoing invites ──────────────────────────────────────────────
  const pendingInvites = invites.filter(i => i.status === "PENDING");

  // ─────────────────────────────────────────────────────────────────────────
  // CHILD MODE
  // ─────────────────────────────────────────────────────────────────────────

  if (shellMode === "child") {
    const allMySpaces: Array<{ id: string; name?: string | null; kind: string; memberCount: number; visibilityScope?: string }> = [
      ...myFamilyUnits.map(u => ({
        id:          u.id,
        name:        u.name,
        kind:        "family",
        memberCount: u.members.filter(m => !m.exitedAt).length,
      })),
      ...myTrustUnits.map(u => ({
        id:              u.id,
        name:            u.name,
        kind:            u.kind,
        memberCount:     u.members.filter(m => !m.exitedAt).length,
        visibilityScope: u.defaultVisibilityScope,
      })),
    ];

    return (
      <div style={{ maxWidth: 680 }}>
        <SpacesSection
          icon="🌟"
          title="Your approved circles"
          count={allMySpaces.length}
          emptyText="You haven't been added to any circles yet. A family member will invite you in."
        >
          {loading ? (
            <LoadingSkeleton />
          ) : (
            allMySpaces.map(s => (
              <SpaceCard
                key={s.id}
                name={s.name}
                kind={s.kind}
                memberCount={s.memberCount}
                visibilityScope={s.visibilityScope}
                isMember
              />
            ))
          )}
        </SpacesSection>

        {allMySpaces.length > 0 && (
          <p style={{ fontSize: 12, color: "#a8a29e", textAlign: "center", marginTop: 4 }}>
            These are the circles your family has approved for you.
          </p>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FOUNDER + MEMBER MODE
  // ─────────────────────────────────────────────────────────────────────────

  const canCreate = shellMode === "founder";
  const totalSpaces = myFamilyUnits.length + myTrustUnits.length;

  return (
    <div style={{ maxWidth: 760 }}>

      {/* ── Family Groups ──────────────────────────────────────────────── */}
      <SpacesSection
        icon="🏠"
        title="Family Groups"
        count={myFamilyUnits.length}
        action={canCreate ? newBtn(onCreateFamily) : undefined}
        emptyText="No family groups yet."
        emptyAction={
          canCreate
            ? emptyCreateBtn("+ Create a family group", onCreateFamily)
            : undefined
        }
      >
        {loading ? (
          <LoadingSkeleton />
        ) : (
          myFamilyUnits.map(u => {
            const activeCount = u.members.filter(m => !m.exitedAt).length;
            const isCreator   = u.createdByUserId === currentUserId;
            return (
              <SpaceCard
                key={u.id}
                name={u.name}
                kind="family"
                memberCount={activeCount}
                isCreator={isCreator}
                isMember={!isCreator}
                onInvite={canCreate ? onInvite : undefined}
              />
            );
          })
        )}
      </SpacesSection>

      {/* ── Trusted Spaces ─────────────────────────────────────────────── */}
      <SpacesSection
        icon="🤝"
        title="Trusted Spaces"
        count={myTrustUnits.length}
        action={canCreate ? newBtn(onCreateSpace) : undefined}
        emptyText="No trusted spaces yet."
        emptyAction={
          canCreate
            ? emptyCreateBtn("+ Create a trusted space", onCreateSpace)
            : undefined
        }
      >
        {loading ? (
          <LoadingSkeleton />
        ) : (
          myTrustUnits.map(u => {
            const activeCount  = u.members.filter(m => !m.exitedAt).length;
            const myMembership = u.members.find(m => m.userId === currentUserId && !m.exitedAt);

            return (
              <SpaceCard
                key={u.id}
                name={u.name}
                kind={u.kind}
                memberCount={activeCount}
                visibilityScope={u.defaultVisibilityScope}
                isMember
                onInvite={canCreate ? onInvite : undefined}
                leaveAction={
                  myMembership && shellMode === "member"
                    ? {
                        membershipId: myMembership.id,
                        busy:         exitingId === myMembership.id,
                        errorMsg:     exitErrors[myMembership.id],
                        onLeave:      handleLeave,
                      }
                    : undefined
                }
              />
            );
          })
        )}
      </SpacesSection>

      {/* ── Pending Invites ─────────────────────────────────────────────── */}
      {(pendingInvites.length > 0 || canCreate) && (
        <SpacesSection
          icon="📨"
          title="Pending Invites"
          count={pendingInvites.length}
          action={
            <button
              type="button"
              onClick={onInvite}
              style={{
                background:   "transparent",
                border:       "1px solid #e7e5e4",
                borderRadius: 8,
                padding:      "4px 12px",
                fontSize:     12,
                fontWeight:   600,
                color:        "#44403c",
                cursor:       "pointer",
              }}
            >
              + Invite
            </button>
          }
          emptyText={
            canCreate
              ? "No pending invites. Send one when you're ready to grow your network."
              : undefined
          }
          emptyAction={
            canCreate
              ? emptyCreateBtn("📨 Invite someone", onInvite)
              : undefined
          }
        >
          {pendingInvites.map(inv => (
            <PendingInviteRow key={inv.id} invite={inv} />
          ))}
        </SpacesSection>
      )}

      {/* ── All-empty state ──────────────────────────────────────────────── */}
      {!loading && totalSpaces === 0 && pendingInvites.length === 0 && (
        <div
          style={{
            background:   "#fff",
            borderRadius: 16,
            border:       "1px solid #e7e5e4",
            padding:      "40px 24px",
            textAlign:    "center",
            marginTop:    8,
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
          <p style={{ fontWeight: 700, fontSize: 15, color: "#1c1917", margin: "0 0 6px" }}>
            No trusted spaces yet
          </p>
          <p style={{ fontSize: 13, color: "#78716c", margin: "0 0 24px", maxWidth: 340, marginInline: "auto" }}>
            {canCreate
              ? "Create a family group or trusted space when you're ready to bring your people together."
              : "Your family network hasn't set up any spaces yet. Your steward will invite you in."}
          </p>
          {canCreate && (
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={onCreateFamily}
                style={{
                  padding:      "9px 18px",
                  borderRadius: 10,
                  border:       "none",
                  background:   "#1c1917",
                  color:        "#fff",
                  fontWeight:   700,
                  fontSize:     13,
                  cursor:       "pointer",
                }}
              >
                🏠 New family group
              </button>
              <button
                type="button"
                onClick={onCreateSpace}
                style={{
                  padding:      "9px 18px",
                  borderRadius: 10,
                  border:       "1px solid #e7e5e4",
                  background:   "#fafaf9",
                  color:        "#1c1917",
                  fontWeight:   700,
                  fontSize:     13,
                  cursor:       "pointer",
                }}
              >
                🤝 New trusted space
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
