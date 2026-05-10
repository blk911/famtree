"use client";

import type { ReactNode } from "react";
import { useState, useEffect, useCallback } from "react";
import {
  listFamilyUnits,
  listTrustUnits,
  listApprovals,
  listInvites,
  listGuardianLinks,
} from "@/components/aihsafe/common/apiClient";
import { GovernanceOverview }       from "@/components/aihsafe/founder/GovernanceOverview";
import { PendingAttention }         from "@/components/aihsafe/founder/PendingAttention";
import { FamilyHealthPanel }        from "@/components/aihsafe/founder/FamilyHealthPanel";
import { TrustedExtensionsPanel }   from "@/components/aihsafe/founder/TrustedExtensionsPanel";
import { RelationshipVisibilityCard } from "@/components/aihsafe/founder/RelationshipVisibilityCard";
import { FounderSettingsPreview }   from "@/components/aihsafe/founder/FounderSettingsPreview";
import { FamilySnapshot }           from "@/components/aihsafe/dashboard/FamilySnapshot";
import { SpacesSnapshot }           from "@/components/aihsafe/dashboard/SpacesSnapshot";
import { QuickCreateModal }         from "@/components/aihsafe/dashboard/QuickCreateModal";
import { FamilyCreatePanel }        from "@/components/aihsafe/family/FamilyCreatePanel";
import { TrustUnitCreatePanel }     from "@/components/aihsafe/trust-unit/TrustUnitCreatePanel";
import { InvitePanel }              from "@/components/aihsafe/invite/InvitePanel";
import { SectionHeader }            from "@/components/aihsafe/common/SectionHeader";
import { ActivityFeed }             from "@/components/aihsafe/feed/ActivityFeed";
import { MembershipPanel }          from "@/components/aihsafe/membership/MembershipPanel";

import type {
  FamilyUnitDTO,
  TrustUnitDTO,
  ApprovalRequestDTO,
  InviteDTO,
  GuardianLinkDTO,
} from "@/types/aihsafe/dto";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FamilySafeShellMode = "founder" | "member" | "child";

type ModalKind = "family" | "space" | "invite" | null;

interface Props {
  currentUserId: string;
  shellMode?: FamilySafeShellMode;
  /** Inserted after hero, before pending attention (e.g. RoleBanner). */
  belowHero?: ReactNode;
  /** Shown above the activity feed (e.g. child approval guidance). */
  feedPreface?: ReactNode;
}

const HERO_COPY: Record<FamilySafeShellMode, { title: string; steward: string }> = {
  founder: {
    title:   "A governed network for your real people.",
    steward: "You are the steward of this family network.",
  },
  member: {
    title:   "Your trusted family spaces",
    steward: "Share with the people who actually know you.",
  },
  child: {
    title:   "Your safe family space",
    steward: "Share updates with your trusted circles.",
  },
};

const MODAL_TITLES: Record<Exclude<ModalKind, null>, string> = {
  family: "New family group",
  space:  "New trusted space",
  invite: "Invite someone",
};

const actionBtn: React.CSSProperties = {
  display:      "flex",
  alignItems:   "center",
  gap:          10,
  width:        "100%",
  textAlign:    "left",
  background:   "#fafaf9",
  border:       "1px solid #e7e5e4",
  borderRadius: 12,
  padding:      "13px 16px",
  cursor:       "pointer",
  marginBottom: 8,
};

function LightStatCard({
  value,
  label,
  urgent = false,
}: {
  value: number | string;
  label: string;
  urgent?: boolean;
}) {
  return (
    <div
      style={{
        background:   "#fff",
        border:       `1px solid ${urgent ? "#fde68a" : "#e7e5e4"}`,
        borderRadius: 10,
        padding:      "8px 14px",
        minWidth:     68,
        boxShadow:    "0 1px 3px rgba(0,0,0,0.06)",
        flexShrink:   0,
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 22, color: urgent ? "#d97706" : "#1c1917", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "#78716c", marginTop: 3, whiteSpace: "nowrap" }}>
        {label}
      </div>
    </div>
  );
}

const iconBox = (bg: string): React.CSSProperties => ({
  width:           34,
  height:          34,
  borderRadius:    10,
  background:      bg,
  display:         "flex",
  alignItems:      "center",
  justifyContent:  "center",
  fontSize:        16,
  flexShrink:      0,
});

/** Read-only sidebar list for minors — no create affordances (UI only; governance remains authoritative). */
function ReadOnlyTrustedSpaces({
  units,
  currentUserId,
  loading,
}: {
  units: TrustUnitDTO[];
  currentUserId: string;
  loading: boolean;
}) {
  const myUnits = units.filter((u) =>
    u.members.some((m) => m.userId === currentUserId && !m.exitedAt),
  );

  return (
    <div
      style={{
        background:   "#fff",
        borderRadius: 16,
        border:       "1px solid #e7e5e4",
        padding:      "20px 22px",
        marginBottom: 14,
      }}
    >
      <SectionHeader title="Spaces you're in" />

      {loading && (
        <p style={{ fontSize: 13, color: "#a8a29e", margin: 0 }}>Loading…</p>
      )}

      {!loading && myUnits.length === 0 && (
        <p style={{ fontSize: 13, color: "#78716c", margin: 0, lineHeight: 1.45 }}>
          You aren&apos;t in a trusted space yet. When someone invites you in, it will show up here.
        </p>
      )}

      {!loading &&
        myUnits.map((u) => (
          <div
            key={u.id}
            style={{
              fontSize:     13,
              padding:      "10px 0",
              borderBottom: "1px solid #f4f4f5",
              color:        "#1c1917",
            }}
          >
            <strong>{u.name?.trim() ? u.name : "Trusted space"}</strong>
          </div>
        ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FounderShell({
  currentUserId,
  shellMode = "founder",
  belowHero,
  feedPreface,
}: Props) {
  const [familyUnits,   setFamilyUnits]   = useState<FamilyUnitDTO[]>([]);
  const [trustUnits,    setTrustUnits]    = useState<TrustUnitDTO[]>([]);
  const [approvals,     setApprovals]     = useState<ApprovalRequestDTO[]>([]);
  const [invites,       setInvites]       = useState<InviteDTO[]>([]);
  const [guardianLinks, setGuardianLinks] = useState<GuardianLinkDTO[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [modal,         setModal]         = useState<ModalKind>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [fuR, tuR, apR, invR, glR] = await Promise.all([
      listFamilyUnits(),
      listTrustUnits(),
      listApprovals("pending"),
      listInvites(),
      listGuardianLinks(),
    ]);
    if (fuR.kind  === "ok") setFamilyUnits(fuR.data.items);
    if (tuR.kind  === "ok") setTrustUnits(tuR.data.items);
    if (apR.kind  === "ok") setApprovals(apR.data.items);
    if (invR.kind === "ok") setInvites(invR.data.items);
    if (glR.kind  === "ok") setGuardianLinks(glR.data.items);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function closeModal() {
    setModal(null);
    load();
  }

  const pendingApprovals   = approvals.filter((a) => a.state === "pending");
  const pendingInvites     = invites.filter((i) => i.status === "PENDING");
  const mySpaces           = trustUnits.filter((u) =>
    u.members.some((m) => m.userId === currentUserId && !m.exitedAt),
  );
  const trustedAdultCount  = guardianLinks.filter((l) => !l.revokedAt).length;
  const membershipCount    = mySpaces.reduce(
    (sum, u) => sum + u.members.filter((m) => !m.exitedAt).length,
    0,
  );

  const mode = shellMode;
  const hero = HERO_COPY[mode];

  const showPendingAttention    = mode === "founder" || mode === "member";
  const showGovernanceColumn    = mode === "founder" || mode === "member";
  const showTrustedExtensions   = mode === "founder";
  const showFounderSettings     = mode === "founder";
  const showQuickActions        = mode === "founder" || mode === "member";
  const feedSectionTitle        = mode === "founder" ? "Family Activity" : "Your activity";

  const feedTrustUnits =
    mode === "child"
      ? trustUnits.filter((u) =>
          u.members.some((m) => m.userId === currentUserId && !m.exitedAt),
        )
      : trustUnits;

  return (
    <div
      style={{
        minHeight:  "100vh",
        background: "#fafaf9",
        padding:    "24px 20px 64px",
        boxSizing:  "border-box",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            position:     "relative",
            borderRadius: 22,
            overflow:     "hidden",
            marginBottom: 20,
            background:   "#fffaf3",
            border:       "1px solid #eadfd2",
            boxShadow:    "0 2px 12px rgba(0,0,0,0.05)",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position:   "absolute",
              left:       0,
              top:        0,
              bottom:     0,
              width:      6,
              background: "linear-gradient(180deg, #7c3aed 0%, #2563eb 100%)",
            }}
          />

          <div
            aria-hidden="true"
            className="aihsafe-hero-img"
            style={{
              position:           "absolute",
              right:              0,
              top:                0,
              bottom:             0,
              width:              "52%",
              backgroundImage:    "url('/uploads/hero%202.jpg')",
              backgroundSize:     "cover",
              backgroundPosition: "center center",
              maskImage:          "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 18%, rgba(0,0,0,0.55) 38%, rgba(0,0,0,1) 65%)",
              WebkitMaskImage:    "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 18%, rgba(0,0,0,0.55) 38%, rgba(0,0,0,1) 65%)",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex:   1,
              padding:  "28px 32px 26px 26px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <svg width="20" height="22" viewBox="0 0 20 22" fill="none" aria-hidden="true">
                <path
                  d="M10 1L1 5v6c0 5.25 3.87 10.17 9 11.38C15.13 21.17 19 16.25 19 11V5L10 1Z"
                  fill="#7c3aed"
                  fillOpacity="0.12"
                  stroke="#7c3aed"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
              <span
                style={{
                  fontSize:      11,
                  fontWeight:    700,
                  color:         "#7c3aed",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Family Safe
              </span>
            </div>

            <h1
              style={{
                margin:        0,
                fontWeight:    800,
                fontSize:      28,
                color:         "#1c1917",
                letterSpacing: "-0.5px",
                lineHeight:    1.1,
              }}
            >
              {hero.title}
            </h1>

            <p
              style={{
                margin:   "8px 0 0",
                fontSize: 13,
                color:    "#78716c",
                maxWidth: 420,
              }}
            >
              {hero.steward}
            </p>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20 }}>
              {mode === "child" ? (
                <>
                  <LightStatCard value={loading ? "…" : mySpaces.length} label="spaces you're in" />
                  <LightStatCard value={loading ? "…" : membershipCount} label="people in those circles" />
                </>
              ) : (
                <>
                  <LightStatCard
                    value={loading ? "…" : pendingApprovals.length}
                    label="approvals waiting"
                    urgent={pendingApprovals.length > 0}
                  />
                  <LightStatCard value={loading ? "…" : mySpaces.length} label="active spaces" />
                  <LightStatCard value={loading ? "…" : trustedAdultCount} label="trusted adults" />
                  <LightStatCard
                    value={loading ? "…" : pendingInvites.length}
                    label="pending invites"
                    urgent={pendingInvites.length > 0}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {belowHero}

        {showPendingAttention && (
          <PendingAttention
            pendingApprovals={pendingApprovals}
            pendingInvites={invites}
            loading={loading}
          />
        )}

        <div
          className="aihsafe-grid"
          style={{
            display:             "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,360px)",
            gap:                 16,
            alignItems:          "start",
          }}
        >
          <div>
            <div style={{ marginBottom: 10 }}>
              <SectionHeader title={feedSectionTitle} />
            </div>
            {feedPreface}
            <ActivityFeed
              currentUserId={currentUserId}
              trustUnits={feedTrustUnits}
              viewerMode={mode}
            />

            <RelationshipVisibilityCard
              familyUnits={familyUnits}
              trustUnits={trustUnits}
              currentUserId={currentUserId}
            />
          </div>

          <div>
            {showGovernanceColumn && (
              <>
                <GovernanceOverview
                  familyCount={familyUnits.length}
                  spaceCount={mySpaces.length}
                  trustedAdults={trustedAdultCount}
                  membershipCount={membershipCount}
                  loading={loading}
                />

                <FamilyHealthPanel
                  pendingApprovalCount={pendingApprovals.length}
                  spaceCount={mySpaces.length}
                  pendingInviteCount={pendingInvites.length}
                  trustedAdultCount={trustedAdultCount}
                  loading={loading}
                />
              </>
            )}

            {showQuickActions && (
              <div
                style={{
                  background:   "#fff",
                  borderRadius: 16,
                  border:       "1px solid #e7e5e4",
                  padding:      "20px 22px",
                  marginBottom: 14,
                }}
              >
                <SectionHeader title="Quick Actions" />

                <button type="button" style={actionBtn} onClick={() => setModal("invite")}>
                  <div style={iconBox("#f0fdf4")}>📨</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#1c1917" }}>Invite someone</div>
                    <div style={{ fontSize: 12, color: "#a8a29e" }}>Send a governed invite</div>
                  </div>
                </button>

                <button type="button" style={actionBtn} onClick={() => setModal("family")}>
                  <div style={iconBox("#eff6ff")}>🏠</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#1c1917" }}>New family group</div>
                    <div style={{ fontSize: 12, color: "#a8a29e" }}>Your household or close relatives</div>
                  </div>
                </button>

                <button type="button" style={{ ...actionBtn, marginBottom: 0 }} onClick={() => setModal("space")}>
                  <div style={iconBox("#faf5ff")}>🤝</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#1c1917" }}>New trusted space</div>
                    <div style={{ fontSize: 12, color: "#a8a29e" }}>Peer pod, extended circle, guardian hub</div>
                  </div>
                </button>
              </div>
            )}

            {mode === "child" && (
              <div
                style={{
                  background:   "#fffbeb",
                  border:       "1px solid #fde68a",
                  borderRadius: 16,
                  padding:      "16px 18px",
                  marginBottom: 14,
                  fontSize:     13,
                  color:        "#78350f",
                  lineHeight:   1.5,
                }}
              >
                Need a new space or want to invite someone? Ask a trusted adult — they can help from their Family Safe
                view.
              </div>
            )}

            {showTrustedExtensions && (
              <TrustedExtensionsPanel
                guardianLinks={guardianLinks}
                currentUserId={currentUserId}
                loading={loading}
              />
            )}

            {showFounderSettings && <FounderSettingsPreview />}

            {mode !== "child" && (
              <>
                <FamilySnapshot
                  units={familyUnits}
                  loading={loading}
                  onCreateClick={() => setModal("family")}
                />

                <SpacesSnapshot
                  units={trustUnits}
                  currentUserId={currentUserId}
                  loading={loading}
                  onCreateClick={() => setModal("space")}
                />
              </>
            )}

            {mode === "child" && (
              <ReadOnlyTrustedSpaces
                units={trustUnits}
                currentUserId={currentUserId}
                loading={loading}
              />
            )}

            {(mode === "member" || mode === "child") && (
              <div style={{ marginBottom: 14 }}>
                <SectionHeader title="Membership controls" />
                <MembershipPanel currentUserId={currentUserId} />
              </div>
            )}
          </div>
        </div>
      </div>

      {modal && (
        <QuickCreateModal title={MODAL_TITLES[modal]} onClose={closeModal}>
          {modal === "family" && <FamilyCreatePanel />}
          {modal === "space"  && <TrustUnitCreatePanel />}
          {modal === "invite" && <InvitePanel />}
        </QuickCreateModal>
      )}
    </div>
  );
}
