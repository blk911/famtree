"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listFamilyUnits,
  listTrustUnits,
  listApprovals,
  listInvites,
  listGuardianLinks,
} from "@/components/aihsafe/common/apiClient";
import { PendingAttention }           from "@/components/aihsafe/founder/PendingAttention";
import { FamilyHealthPanel }          from "@/components/aihsafe/founder/FamilyHealthPanel";
import { FounderSettingsEditor }      from "@/components/aihsafe/founder/FounderSettingsEditor";
import { OverviewCommandCard }        from "@/components/aihsafe/founder/OverviewCommandCard";
import { NextBestActions }            from "@/components/aihsafe/founder/NextBestActions";
import { RecentActivityTeaser }       from "@/components/aihsafe/founder/RecentActivityTeaser";
import { QuickCreateModal }           from "@/components/aihsafe/dashboard/QuickCreateModal";
import { FamilyCreatePanel }          from "@/components/aihsafe/family/FamilyCreatePanel";
import { TrustUnitCreatePanel }       from "@/components/aihsafe/trust-unit/TrustUnitCreatePanel";
import { InvitePanel }                from "@/components/aihsafe/invite/InvitePanel";
import { SectionHeader }              from "@/components/aihsafe/common/SectionHeader";
import { ActivityFeed }               from "@/components/aihsafe/feed/ActivityFeed";
import { GuardianInbox }              from "@/components/aihsafe/guardian/GuardianInbox";
import { SpacesTab }                  from "@/components/aihsafe/spaces/SpacesTab";
import {
  FamilySafeTabs,
  getVisibleTabs,
  defaultTab,
  type TabId,
} from "@/components/aihsafe/navigation/FamilySafeTabs";
import { PeopleTab } from "@/components/aihsafe/people/PeopleTab";
import { ChildEscalationStatus } from "@/components/aihsafe/child/ChildEscalationStatus";

import type {
  FamilyUnitDTO,
  TrustUnitDTO,
  ApprovalRequestDTO,
  InviteDTO,
  GuardianLinkDTO,
} from "@/types/aihsafe/dto";

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalKind = "family" | "space" | "invite" | null;

/** UI shell mode — controls which panels are rendered. NOT a security boundary. */
export type FamilySafeShellMode = "founder" | "member" | "child";

interface Props {
  currentUserId: string;
  /** Derived from role + ageTier at the page level. Defaults to "founder". */
  shellMode?: FamilySafeShellMode;
}

// ─── Shared style constants ───────────────────────────────────────────────────

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

const railCard: React.CSSProperties = {
  background:   "#fff",
  borderRadius: 16,
  border:       "1px solid #e7e5e4",
  padding:      "20px 22px",
  marginBottom: 14,
};

const tabCard: React.CSSProperties = {
  background:   "#fff",
  borderRadius: 16,
  border:       "1px solid #e7e5e4",
  padding:      "22px 24px",
  marginBottom: 14,
};

// ─── Hero stat card ───────────────────────────────────────────────────────────

function LightStatCard({
  value, label, urgent = false,
}: { value: number | string; label: string; urgent?: boolean }) {
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

// ─── Hero card (shared wrapper) ───────────────────────────────────────────────

function HeroCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position:     "relative",
        borderRadius: 22,
        overflow:     "hidden",
        marginBottom: 16,
        background:   "#fffaf3",
        border:       "1px solid #eadfd2",
        boxShadow:    "0 2px 12px rgba(0,0,0,0.05)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position:   "absolute",
          left:       0, top: 0, bottom: 0,
          width:      6,
          background: "linear-gradient(180deg, #7c3aed 0%, #2563eb 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="aihsafe-hero-img"
        style={{
          position:           "absolute",
          right:              0, top: 0, bottom: 0,
          width:              "52%",
          backgroundImage:    "url('/uploads/hero%202.jpg')",
          backgroundSize:     "cover",
          backgroundPosition: "center center",
          maskImage:          "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 18%, rgba(0,0,0,0.55) 38%, rgba(0,0,0,1) 65%)",
          WebkitMaskImage:    "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 18%, rgba(0,0,0,0.55) 38%, rgba(0,0,0,1) 65%)",
        }}
      />
      <div style={{ position: "relative", zIndex: 1, padding: "28px 32px 26px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <svg width="20" height="22" viewBox="0 0 20 22" fill="none" aria-hidden="true">
            <path
              d="M10 1L1 5v6c0 5.25 3.87 10.17 9 11.38C15.13 21.17 19 16.25 19 11V5L10 1Z"
              fill="#7c3aed" fillOpacity="0.12"
              stroke="#7c3aed" strokeWidth="1.5" strokeLinejoin="round"
            />
          </svg>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Msg Vault
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Tab panel wrapper (ARIA) ─────────────────────────────────────────────────

function TabPanel({
  id, activeTab, children,
}: { id: TabId; activeTab: TabId; children: React.ReactNode }) {
  const isActive = id === activeTab;
  return (
    <div
      role="tabpanel"
      id={`aihsafe-panel-${id}`}
      aria-labelledby={`aihsafe-tab-${id}`}
      hidden={!isActive}
    >
      {isActive && children}
    </div>
  );
}

// ─── Shell-level load error banner ───────────────────────────────────────────

function LoadErrorBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      style={{
        background:   "#fef2f2",
        border:       "1px solid #fca5a5",
        borderRadius: 14,
        padding:      "14px 18px",
        marginBottom: 16,
        display:      "flex",
        alignItems:   "center",
        gap:          12,
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0 }}>⚠</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: "#dc2626" }}>
          Couldn&apos;t load your family data
        </div>
        <div style={{ fontSize: 12, color: "#78716c", marginTop: 2 }}>
          Check your connection and try again. Your data is safe.
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        style={{
          padding:      "7px 14px",
          borderRadius: 9,
          border:       "1px solid #fca5a5",
          background:   "#fff",
          color:        "#dc2626",
          fontWeight:   600,
          fontSize:     12,
          cursor:       "pointer",
          flexShrink:   0,
        }}
      >
        Retry
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FounderShell({ currentUserId, shellMode = "founder" }: Props) {
  const [familyUnits,   setFamilyUnits]   = useState<FamilyUnitDTO[]>([]);
  const [trustUnits,    setTrustUnits]    = useState<TrustUnitDTO[]>([]);
  const [approvals,     setApprovals]     = useState<ApprovalRequestDTO[]>([]);
  const [invites,       setInvites]       = useState<InviteDTO[]>([]);
  const [guardianLinks, setGuardianLinks] = useState<GuardianLinkDTO[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [loadError,     setLoadError]     = useState(false);
  const [modal,         setModal]         = useState<ModalKind>(null);
  const [activeTab,     setActiveTab]     = useState<TabId>(() => defaultTab(shellMode));

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
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
    } catch {
      setLoadError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function closeModal() { setModal(null); load(); }

  // ── Derived counts ──────────────────────────────────────────────────────────
  const pendingApprovals  = approvals.filter((a) => a.state === "pending");
  const pendingInvites    = invites.filter((i) => i.status === "PENDING");
  const mySpaces          = trustUnits.filter((u) =>
    u.members.some((m) => m.userId === currentUserId && !m.exitedAt)
  );
  const trustedAdultCount = guardianLinks.filter((l) => !l.revokedAt).length;
  const membershipCount   = mySpaces.reduce(
    (sum, u) => sum + u.members.filter((m) => !m.exitedAt).length, 0
  );
  const isGuardian        = guardianLinks.some((l) => !l.revokedAt);

  // ── Tab visibility + badges ─────────────────────────────────────────────────
  const visibleTabs  = getVisibleTabs(shellMode, isGuardian);
  const pendingCount = pendingApprovals.length + pendingInvites.length;

  return (
    <div style={{ minHeight: "100vh", background: "#fafaf9", padding: "24px 20px 64px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* ════════════════════════════════════════════════════════
            HERO — varies by shellMode
            ════════════════════════════════════════════════════════ */}

        {shellMode === "founder" && (
          <HeroCard>
            <h1 style={{ margin: 0, fontWeight: 800, fontSize: 28, color: "#1c1917", letterSpacing: "-0.5px", lineHeight: 1.1 }}>
              A governed network for your real people.
            </h1>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "#78716c", maxWidth: 420 }}>
              You are the steward of this family network.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20 }}>
              <LightStatCard value={loading ? "…" : pendingApprovals.length} label="approvals waiting" urgent={pendingApprovals.length > 0} />
              <LightStatCard value={loading ? "…" : mySpaces.length}         label="active spaces" />
              <LightStatCard value={loading ? "…" : trustedAdultCount}       label="trusted adults" />
              <LightStatCard value={loading ? "…" : pendingInvites.length}   label="pending invites" urgent={pendingInvites.length > 0} />
            </div>
          </HeroCard>
        )}

        {shellMode === "member" && (
          <HeroCard>
            <h1 style={{ margin: 0, fontWeight: 800, fontSize: 26, color: "#1c1917", letterSpacing: "-0.4px", lineHeight: 1.15 }}>
              Your trusted family spaces
            </h1>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "#78716c", maxWidth: 400 }}>
              Share with the people who actually know you.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <LightStatCard value={loading ? "…" : mySpaces.length} label="spaces you're in" />
            </div>
          </HeroCard>
        )}

        {shellMode === "child" && (
          <HeroCard>
            <h1 style={{ margin: 0, fontWeight: 800, fontSize: 26, color: "#1c1917", letterSpacing: "-0.4px", lineHeight: 1.15 }}>
              Your safe family space
            </h1>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "#78716c", maxWidth: 380 }}>
              Share updates with your trusted circles — only people approved by your family can see them.
            </p>
          </HeroCard>
        )}

        {/* Shell-level load error */}
        {loadError && <LoadErrorBanner onRetry={load} />}

        {/* ════════════════════════════════════════════════════════
            INTERNAL NAVIGATION TAB BAR
            ════════════════════════════════════════════════════════ */}

        <FamilySafeTabs
          tabs={visibleTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          badges={pendingCount > 0 ? { approvals: pendingCount } : undefined}
        />

        {/* ════════════════════════════════════════════════════════
            TAB PANELS
            ════════════════════════════════════════════════════════ */}

        {/* ── OVERVIEW ──────────────────────────────────────────── */}
        <TabPanel id="overview" activeTab={activeTab}>

          {shellMode === "founder" && (
            <div
              className="aihsafe-grid"
              style={{ display: "grid", gap: 16, alignItems: "start" }}
            >
              {/* Left: attention signal + health + activity teaser */}
              <div>
                <OverviewCommandCard
                  pendingApprovalCount={pendingApprovals.length}
                  pendingInviteCount={pendingInvites.length}
                  loading={loading}
                  onReviewApprovals={() => setActiveTab("approvals")}
                />
                <FamilyHealthPanel
                  pendingApprovalCount={pendingApprovals.length}
                  spaceCount={mySpaces.length}
                  pendingInviteCount={pendingInvites.length}
                  trustedAdultCount={trustedAdultCount}
                  loading={loading}
                />
                <RecentActivityTeaser onSeeAll={() => setActiveTab("activity")} />
              </div>

              {/* Right: contextual next steps */}
              <div>
                <NextBestActions
                  shellMode={shellMode}
                  isGuardian={isGuardian}
                  pendingApprovalCount={pendingApprovals.length}
                  totalSpaceCount={mySpaces.length + familyUnits.length}
                  trustedAdultCount={trustedAdultCount}
                  onTabChange={setActiveTab}
                  onInvite={() => setModal("invite")}
                  onCreateSpace={() => setModal("space")}
                  onCreateFamily={() => setModal("family")}
                />
              </div>
            </div>
          )}

          {shellMode === "member" && (
            <div style={{ maxWidth: 680 }}>
              {/* Compact guardian attention signal — routes to Approvals tab */}
              {isGuardian && (
                <OverviewCommandCard
                  pendingApprovalCount={pendingApprovals.length}
                  pendingInviteCount={0}
                  loading={loading}
                  onReviewApprovals={() => setActiveTab("approvals")}
                />
              )}

              {/* Network summary — compact, directs to Spaces/People tabs */}
              <div style={tabCard}>
                <SectionHeader title="Your network" />
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                  <LightStatCard value={loading ? "…" : mySpaces.length} label="spaces you're in" />
                  {isGuardian && (
                    <LightStatCard value={loading ? "…" : trustedAdultCount} label="trusted adults" />
                  )}
                </div>
                {!loading && mySpaces.length === 0 && (
                  <p style={{ fontSize: 13, color: "#78716c", margin: 0 }}>
                    You haven&apos;t joined a trusted space yet. Your family steward will invite you in.
                  </p>
                )}
                {!loading && mySpaces.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setActiveTab("spaces")}
                      style={{
                        background:   "none",
                        border:       "1px solid #e7e5e4",
                        borderRadius: 8,
                        padding:      "5px 12px",
                        fontSize:     12,
                        fontWeight:   600,
                        color:        "#57534e",
                        cursor:       "pointer",
                      }}
                    >
                      Manage spaces →
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("people")}
                      style={{
                        background:   "none",
                        border:       "1px solid #e7e5e4",
                        borderRadius: 8,
                        padding:      "5px 12px",
                        fontSize:     12,
                        fontWeight:   600,
                        color:        "#57534e",
                        cursor:       "pointer",
                      }}
                    >
                      See people →
                    </button>
                  </div>
                )}
              </div>

              {/* Contextual next steps */}
              <NextBestActions
                shellMode={shellMode}
                isGuardian={isGuardian}
                pendingApprovalCount={pendingApprovals.length}
                totalSpaceCount={mySpaces.length}
                trustedAdultCount={trustedAdultCount}
                onTabChange={setActiveTab}
                onInvite={() => setModal("invite")}
                onCreateSpace={() => setModal("space")}
                onCreateFamily={() => setModal("family")}
              />
            </div>
          )}

          {shellMode === "child" && (
            <div style={{ maxWidth: 540 }}>
              <div style={tabCard}>
                <div style={{ textAlign: "center", padding: "12px 0 20px" }}>
                  <div style={{ fontSize: 44, marginBottom: 12 }}>❤️</div>
                  <p style={{ fontWeight: 700, fontSize: 17, color: "#1c1917", margin: "0 0 8px" }}>
                    You&apos;re in your family&apos;s safe space.
                  </p>
                  <p style={{ fontSize: 13, color: "#78716c", margin: "0 0 24px", maxWidth: 310, marginInline: "auto", lineHeight: 1.6 }}>
                    Everything you share here is private to the circles your family has approved. Only trusted people can see it.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("activity")}
                    style={{
                      display:      "inline-flex",
                      alignItems:   "center",
                      gap:          8,
                      padding:      "10px 22px",
                      borderRadius: 11,
                      border:       "none",
                      background:   "#1c1917",
                      color:        "#fff",
                      fontWeight:   700,
                      fontSize:     13,
                      cursor:       "pointer",
                    }}
                  >
                    💬 See what&apos;s happening
                  </button>
                </div>
              </div>

              {/* Pending guardian approvals — so the child knows what's waiting */}
              <div style={{ ...tabCard, padding: "18px 20px" }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#1c1917", marginBottom: 12 }}>
                  Waiting for approval
                </div>
                <ChildEscalationStatus />
              </div>
            </div>
          )}

        </TabPanel>

        {/* ── ACTIVITY ──────────────────────────────────────────── */}
        <TabPanel id="activity" activeTab={activeTab}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <ActivityFeed
              currentUserId={currentUserId}
              trustUnits={trustUnits}
              viewerMode={shellMode}
            />
          </div>
        </TabPanel>

        {/* ── SPACES ────────────────────────────────────────────── */}
        <TabPanel id="spaces" activeTab={activeTab}>
          <SpacesTab
            currentUserId={currentUserId}
            shellMode={shellMode}
            trustUnits={trustUnits}
            familyUnits={familyUnits}
            invites={invites}
            loading={loading}
            onCreateSpace={() => setModal("space")}
            onCreateFamily={() => setModal("family")}
            onInvite={() => setModal("invite")}
            onReload={load}
          />
        </TabPanel>

        {/* ── PEOPLE ────────────────────────────────────────────── */}
        <TabPanel id="people" activeTab={activeTab}>
          <PeopleTab
            currentUserId={currentUserId}
            shellMode={shellMode}
            trustUnits={trustUnits}
            familyUnits={familyUnits}
            guardianLinks={guardianLinks}
            invites={invites}
            loading={loading}
          />
        </TabPanel>

        {/* ── APPROVALS ─────────────────────────────────────────── */}
        <TabPanel id="approvals" activeTab={activeTab}>
          <div style={{ maxWidth: 720 }}>
            {/* Founder: PendingAttention already embeds GuardianInbox internally
                when there are pending approvals. Show it always for the full
                all-clear / pending summary. */}
            {shellMode === "founder" && (
              <PendingAttention
                pendingApprovals={pendingApprovals}
                pendingInvites={invites}
                loading={loading}
              />
            )}

            {/* Guardian member (non-founder): show Guardian Inbox directly. */}
            {shellMode !== "founder" && isGuardian && (
              <div style={tabCard}>
                <SectionHeader title="Guardian Inbox" />
                <GuardianInbox />
              </div>
            )}
          </div>
        </TabPanel>

        {/* ── SETTINGS ──────────────────────────────────────────── */}
        <TabPanel id="settings" activeTab={activeTab}>
          {shellMode === "founder" && (
            <div style={{ maxWidth: 680 }}>
              <FounderSettingsEditor />
            </div>
          )}
        </TabPanel>

      </div>

      {/* Quick-create modal */}
      {modal && (
        <QuickCreateModal
          title={
            modal === "family" ? "New family group" :
            modal === "space"  ? "New trusted space" :
                                 "Invite someone"
          }
          onClose={closeModal}
        >
          {modal === "family" && <FamilyCreatePanel />}
          {modal === "space"  && <TrustUnitCreatePanel />}
          {modal === "invite" && <InvitePanel />}
        </QuickCreateModal>
      )}
    </div>
  );
}
