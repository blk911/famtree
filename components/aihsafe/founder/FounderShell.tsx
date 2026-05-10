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
import { CompactActivityItem }      from "@/components/aihsafe/common/CompactActivityItem";
import { SectionHeader }            from "@/components/aihsafe/common/SectionHeader";

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

interface DerivedActivity {
  icon:  string;
  label: string;
  time:  string;
  ts:    number;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const ms  = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1_000);
  if (sec < 60)  return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60)  return `${min}m ago`;
  const hr  = Math.floor(min / 60);
  if (hr  < 24)  return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7)   return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

function deriveActivity(
  familyUnits:   FamilyUnitDTO[],
  trustUnits:    TrustUnitDTO[],
  invites:       InviteDTO[],
  guardianLinks: GuardianLinkDTO[],
): DerivedActivity[] {
  const items: DerivedActivity[] = [];

  familyUnits.forEach(u => {
    items.push({ icon: "🏠", label: `Family group "${u.name}" created`, time: u.createdAt, ts: new Date(u.createdAt).getTime() });
  });
  trustUnits.forEach(u => {
    items.push({ icon: "🤝", label: `Trusted space "${u.name ?? u.kind}" created`, time: u.createdAt, ts: new Date(u.createdAt).getTime() });
  });
  invites.forEach(inv => {
    const verb = inv.status === "REGISTERED" ? "joined via invite" : inv.status === "ACCEPTED" ? "accepted invite" : "invite sent to";
    items.push({ icon: "📨", label: `${verb} ${inv.recipientEmail}`, time: inv.createdAt, ts: new Date(inv.createdAt).getTime() });
  });
  guardianLinks.filter(l => !l.revokedAt).forEach(link => {
    items.push({ icon: "🛡", label: `Guardian link established with ${link.childName || link.guardianName}`, time: link.establishedAt, ts: new Date(link.establishedAt).getTime() });
  });

  return items.sort((a, b) => b.ts - a.ts).slice(0, 7);
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
  const activity           = deriveActivity(familyUnits, trustUnits, invites, guardianLinks);

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

        {/* ── Founder header ── */}
        <div
          style={{
            background:   "#fff",
            borderRadius: 20,
            border:       "1px solid #e7e5e4",
            padding:      "28px 32px",
            marginBottom: 20,
            display:      "flex",
            alignItems:   "center",
            justifyContent: "space-between",
            flexWrap:     "wrap",
            gap:          20,
            position:     "relative",
            overflow:     "hidden",
          }}
        >
          {/* Left accent stripe */}
          <div
            aria-hidden="true"
            style={{
              position:   "absolute",
              left:       0,
              top:        0,
              bottom:     0,
              width:      4,
              background: "linear-gradient(180deg, #0f3460, #7c3aed)",
              borderRadius: "20px 0 0 20px",
            }}
          />

          {/* Identity */}
          <div style={{ paddingLeft: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
              AMIHUMAN.NET
            </div>
            <h1 style={{ margin: 0, fontWeight: 800, fontSize: 26, color: "#1c1917", letterSpacing: "-0.5px" }}>
              Family Safe
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "#78716c" }}>
              A governed network for your real people.
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#a8a29e" }}>
              You are the steward of this family network.
            </p>
          </div>

          {/* Awareness pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <AwarenessPill
              value={loading ? "…" : pendingApprovals.length}
              label="approvals waiting"
              urgent={pendingApprovals.length > 0}
            />
            <AwarenessPill
              value={loading ? "…" : mySpaces.length}
              label="active spaces"
              urgent={false}
            />
            <AwarenessPill
              value={loading ? "…" : trustedAdultCount}
              label="trusted adults"
              urgent={false}
            />
            <AwarenessPill
              value={loading ? "…" : pendingInvites.length}
              label="pending invites"
              urgent={pendingInvites.length > 0}
            />
          </div>
        </div>

        {/* ── Pending attention — MOST PROMINENT ── */}
        <PendingAttention
          pendingApprovals={pendingApprovals}
          pendingInvites={invites}
          loading={loading}
        />

        {/* ── Main grid ── */}
        <div
          className="aihsafe-grid"
          style={{
            display:             "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,360px)",
            gap:                 16,
            alignItems:          "start",
          }}
        >
          {/* LEFT COLUMN */}
          <div>
            {/* Governance overview */}
            <GovernanceOverview
              familyCount={familyUnits.length}
              spaceCount={mySpaces.length}
              trustedAdults={trustedAdultCount}
              membershipCount={membershipCount}
              loading={loading}
            />

            {/* Family snapshot */}
            <FamilySnapshot
              units={familyUnits}
              loading={loading}
              onCreateClick={() => setModal("family")}
            />

            {/* Spaces snapshot */}
            <SpacesSnapshot
              units={trustUnits}
              currentUserId={currentUserId}
              loading={loading}
              onCreateClick={() => setModal("space")}
            />

            {/* Relationship visibility */}
            <RelationshipVisibilityCard
              familyUnits={familyUnits}
              trustUnits={trustUnits}
              currentUserId={currentUserId}
            />
          </div>

          {/* RIGHT COLUMN */}
          <div>
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
          </div>
        </div>

        {/* ── Activity ribbon ── */}
        <div
          style={{
            background:   "#fff",
            borderRadius: 16,
            border:       "1px solid #e7e5e4",
            padding:      "20px 22px",
            marginTop:    4,
          }}
        >
          <SectionHeader title="Recent Activity" />

          {loading && (
            <p style={{ fontSize: 13, color: "#a8a29e", margin: 0 }}>Loading…</p>
          )}

          {!loading && activity.length === 0 && (
            <p style={{ fontSize: 13, color: "#a8a29e", margin: 0 }}>
              No recent activity — your network is just getting started.
            </p>
          )}

          {!loading && activity.map((ev, i) => (
            <CompactActivityItem
              key={i}
              icon={ev.icon}
              label={ev.label}
              time={relativeTime(ev.time)}
              faded={i >= 4}
            />
          ))}

          {!loading && activity.length === 0 && (
            <p style={{ fontSize: 11, color: "#d6d3d1", margin: "10px 0 0", textAlign: "center" }}>
              Activity is derived from your real network data — no mock events here
            </p>
          )}
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

// ─── Awareness pill ───────────────────────────────────────────────────────────

function AwarenessPill({
  value,
  label,
  urgent,
}: {
  value:  number | string;
  label:  string;
  urgent: boolean;
}) {
  return (
    <div
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        padding:        "10px 16px",
        borderRadius:   12,
        background:     urgent ? "#fffbeb" : "#fafaf9",
        border:         `1px solid ${urgent ? "#fde68a" : "#e7e5e4"}`,
        minWidth:       64,
      }}
    >
      <span
        style={{
          fontWeight:    800,
          fontSize:      20,
          color:         urgent ? "#d97706" : "#0f3460",
          lineHeight:    1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: 11, color: "#a8a29e", marginTop: 3, whiteSpace: "nowrap", textAlign: "center" }}>
        {label}
      </span>
    </div>
  );
}
