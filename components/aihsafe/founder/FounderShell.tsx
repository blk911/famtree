"use client";

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

import type {
  FamilyUnitDTO,
  TrustUnitDTO,
  ApprovalRequestDTO,
  InviteDTO,
  GuardianLinkDTO,
} from "@/types/aihsafe/dto";

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalKind = "family" | "space" | "invite" | null;

interface Props {
  currentUserId: string;
}



const MODAL_TITLES: Record<Exclude<ModalKind, null>, string> = {
  family: "New family group",
  space:  "New trusted space",
  invite: "Invite someone",
};

// ─── Quick action button style ────────────────────────────────────────────────

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

// ─── Light stat card (hero) ───────────────────────────────────────────────────

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
  width:          34,
  height:         34,
  borderRadius:   10,
  background:     bg,
  display:        "flex",
  alignItems:     "center",
  justifyContent: "center",
  fontSize:       16,
  flexShrink:     0,
});

// ─── Main component ───────────────────────────────────────────────────────────

export function FounderShell({ currentUserId }: Props) {
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

  // Derived counts
  const pendingApprovals   = approvals.filter(a => a.state === "pending");
  const pendingInvites     = invites.filter(i => i.status === "PENDING");
  const mySpaces           = trustUnits.filter(u => u.members.some(m => m.userId === currentUserId && !m.exitedAt));
  const trustedAdultCount  = guardianLinks.filter(l => !l.revokedAt).length;
  const membershipCount    = mySpaces.reduce((sum, u) => sum + u.members.filter(m => !m.exitedAt).length, 0);

  return (
    <div
      style={{
        minHeight:   "100vh",
        background:  "#fafaf9",
        padding:     "24px 20px 64px",
        boxSizing:   "border-box",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* ── Light hero card ── */}
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
          {/* Purple-blue left accent stripe */}
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

          {/* Right: family image, masked left-to-transparent to blend into card */}
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

          {/* Content — offset for stripe */}
          <div
            style={{
              position: "relative",
              zIndex:   1,
              padding:  "28px 32px 26px 26px",
            }}
          >
            {/* Shield + mode label */}
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

            {/* Title */}
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
              A governed network for your real people.
            </h1>

            {/* Steward line */}
            <p
              style={{
                margin:   "8px 0 0",
                fontSize: 13,
                color:    "#78716c",
                maxWidth: 420,
              }}
            >
              You are the steward of this family network.
            </p>

            {/* Stat cards */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20 }}>
              <LightStatCard
                value={loading ? "…" : pendingApprovals.length}
                label="approvals waiting"
                urgent={pendingApprovals.length > 0}
              />
              <LightStatCard value={loading ? "…" : mySpaces.length}      label="active spaces" />
              <LightStatCard value={loading ? "…" : trustedAdultCount}    label="trusted adults" />
              <LightStatCard
                value={loading ? "…" : pendingInvites.length}
                label="pending invites"
                urgent={pendingInvites.length > 0}
              />
            </div>
          </div>
        </div>

        {/* ── Pending attention — MOST PROMINENT ── */}
        <PendingAttention
          pendingApprovals={pendingApprovals}
          pendingInvites={invites}
          loading={loading}
        />

        {/* ── Main grid: feed (center) + governance (right) ── */}
        <div
          className="aihsafe-grid"
          style={{
            display:             "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,360px)",
            gap:                 16,
            alignItems:          "start",
          }}
        >
          {/* CENTER: governed activity feed */}
          <div>
            <div style={{ marginBottom: 10 }}>
              <SectionHeader title="Family Activity" />
            </div>
            <ActivityFeed
              currentUserId={currentUserId}
              trustUnits={trustUnits}
            />

            {/* Relationship visibility (lower center) */}
            <RelationshipVisibilityCard
              familyUnits={familyUnits}
              trustUnits={trustUnits}
              currentUserId={currentUserId}
            />
          </div>

          {/* RIGHT: governance awareness panel */}
          <div>
            {/* Governance overview */}
            <GovernanceOverview
              familyCount={familyUnits.length}
              spaceCount={mySpaces.length}
              trustedAdults={trustedAdultCount}
              membershipCount={membershipCount}
              loading={loading}
            />

            {/* Family health */}
            <FamilyHealthPanel
              pendingApprovalCount={pendingApprovals.length}
              spaceCount={mySpaces.length}
              pendingInviteCount={pendingInvites.length}
              trustedAdultCount={trustedAdultCount}
              loading={loading}
            />

            {/* Quick actions */}
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

            {/* Trusted extensions */}
            <TrustedExtensionsPanel
              guardianLinks={guardianLinks}
              currentUserId={currentUserId}
              loading={loading}
            />

            {/* Governance settings preview */}
            <FounderSettingsPreview />

            {/* Family + Spaces snapshots (sidebar, lower) */}
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
          </div>
        </div>
      </div>

      {/* Quick-create modal */}
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

