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
import {
  countDraftTrustUnits,
  getActiveTrustUnits,
  TRUST_CIRCLES_EMPTY_HINT,
  TRUST_CIRCLES_EMPTY_SUBHINT,
  TRUST_CIRCLES_EMPTY_TITLE,
} from "@/lib/trust/display";

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
  onOpenSpaceActivity?: (trustUnitId: string) => void;
}

function sectionCta(label: string, onClick: () => void, accent = false) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={accent ? "aihsafe-spaces-cta aihsafe-spaces-cta--primary" : "aihsafe-spaces-cta"}
    >
      {label}
    </button>
  );
}

function emptyCta(label: string, onClick: () => void) {
  return (
    <button type="button" onClick={onClick} className="aihsafe-spaces-cta aihsafe-spaces-cta--empty">
      {label}
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <>
      {[1, 2].map((i) => (
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
  onOpenSpaceActivity,
}: Props) {
  const [exitingId,  setExitingId]  = useState<string | null>(null);
  const [exitErrors, setExitErrors] = useState<Record<string, string>>({});

  const handleLeave = useCallback(async (membershipId: string) => {
    setExitingId(membershipId);
    setExitErrors((e) => { const c = { ...e }; delete c[membershipId]; return c; });
    const r = await exitMembership(membershipId);
    setExitingId(null);
    if (r.kind === "ok") {
      onReload();
    } else {
      const msg = r.kind === "error" ? r.message
        : r.kind === "denied" ? r.message
        : "Couldn't leave that space right now.";
      setExitErrors((e) => ({ ...e, [membershipId]: msg }));
    }
  }, [onReload]);

  const myTrustUnits = trustUnits.filter((u) =>
    u.members.some((m) => m.userId === currentUserId && !m.exitedAt),
  );
  const activeTrustUnits = getActiveTrustUnits(myTrustUnits, currentUserId);
  const draftTrustCount = countDraftTrustUnits(myTrustUnits, currentUserId);

  const myFamilyUnits = familyUnits.filter((u) =>
    u.status !== "dissolved" &&
    u.members.some((m) => m.userId === currentUserId && !m.exitedAt),
  );

  const pendingInvites = invites.filter((i) => i.status === "PENDING");

  if (shellMode === "child") {
    const allMySpaces: Array<{ id: string; name?: string | null; kind: string; memberCount: number; visibilityScope?: string }> = [
      ...myFamilyUnits.map((u) => ({
        id:          u.id,
        name:        u.name,
        kind:        "family",
        memberCount: u.members.filter((m) => !m.exitedAt).length,
      })),
      ...activeTrustUnits.map((u) => ({
        id:              u.id,
        name:            u.name,
        kind:            u.kind,
        memberCount:     u.members.filter((m) => !m.exitedAt).length,
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
            allMySpaces.map((s) => (
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

  const canCreate = shellMode === "founder";
  const totalSpaces = myFamilyUnits.length + activeTrustUnits.length;

  const trustEmpty = (
    <>
      <p style={{ fontWeight: 600, fontSize: 14, color: "#44403c", margin: "0 0 6px" }}>
        {TRUST_CIRCLES_EMPTY_TITLE}
      </p>
      <p style={{ fontSize: 13, color: "#78716c", margin: "0 0 14px", lineHeight: 1.45 }}>
        {TRUST_CIRCLES_EMPTY_HINT}
      </p>
    </>
  );

  return (
    <div style={{ maxWidth: 760 }}>
      <SpacesSection
        icon="🏠"
        title="Family Groups"
        count={myFamilyUnits.length}
        action={canCreate ? sectionCta("+ Family Group", onCreateFamily) : undefined}
        emptyText={canCreate ? "No family groups yet." : "No family groups in your network yet."}
        emptyAction={canCreate ? emptyCta("+ Family Group", onCreateFamily) : undefined}
      >
        {loading ? (
          <LoadingSkeleton />
        ) : (
          myFamilyUnits.map((u) => {
            const activeCount = u.members.filter((m) => !m.exitedAt).length;
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

      <SpacesSection
        icon="🤝"
        title="Trusted Spaces"
        count={activeTrustUnits.length}
        action={canCreate ? sectionCta("+ Trusted Space", onCreateSpace, true) : undefined}
        emptyText={canCreate ? undefined : TRUST_CIRCLES_EMPTY_TITLE}
        emptyAction={
          canCreate ? (
            <div style={{ textAlign: "center" }}>
              {trustEmpty}
              {emptyCta("+ Trusted Space", onCreateSpace)}
            </div>
          ) : undefined
        }
      >
        {loading ? (
          <LoadingSkeleton />
        ) : (
          activeTrustUnits.map((u) => {
            const activeCount  = u.members.filter((m) => !m.exitedAt).length;
            const myMembership = u.members.find((m) => m.userId === currentUserId && !m.exitedAt);

            return (
              <SpaceCard
                key={u.id}
                trustUnitId={u.id}
                vaultSpaceType={u.vaultSpaceType}
                name={u.name}
                kind={u.kind}
                memberCount={activeCount}
                visibilityScope={u.defaultVisibilityScope}
                isMember
                onInvite={canCreate ? onInvite : undefined}
                onViewActivity={onOpenSpaceActivity}
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

      {!loading && draftTrustCount > 0 && (
        <p className="aihsafe-spaces-draft-note">
          <strong>Draft — setup needed</strong>
          {draftTrustCount > 1 ? ` (${draftTrustCount} spaces)` : ""}. {TRUST_CIRCLES_EMPTY_SUBHINT}
        </p>
      )}

      {(pendingInvites.length > 0 || canCreate) && (
        <SpacesSection
          icon="📨"
          title="Pending Invites"
          count={pendingInvites.length}
          action={canCreate ? sectionCta("+ Invite", onInvite) : undefined}
          emptyText={
            canCreate
              ? "No outstanding invites. Send one when you're ready to grow your trusted circle."
              : undefined
          }
          emptyAction={canCreate ? emptyCta("Invite someone", onInvite) : undefined}
        >
          {pendingInvites.map((inv) => (
            <PendingInviteRow key={inv.id} invite={inv} />
          ))}
        </SpacesSection>
      )}

      {!loading && totalSpaces === 0 && pendingInvites.length === 0 && (
        <div className="aihsafe-spaces-all-empty">
          <div style={{ fontSize: 40, marginBottom: 12 }} aria-hidden="true">🌱</div>
          <p style={{ fontWeight: 700, fontSize: 15, color: "#1c1917", margin: "0 0 6px" }}>
            {TRUST_CIRCLES_EMPTY_TITLE}
          </p>
          <p style={{ fontSize: 13, color: "#78716c", margin: "0 0 20px", maxWidth: 360, marginInline: "auto", lineHeight: 1.45 }}>
            {TRUST_CIRCLES_EMPTY_SUBHINT}
          </p>
          {canCreate && (
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              {emptyCta("+ Trusted Space", onCreateSpace)}
              {emptyCta("+ Family Group", onCreateFamily)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
