"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listFamilyUnits,
  listTrustUnits,
  listApprovals,
  listInvites,
  listGuardianLinks,
  listActivityFeed,
} from "@/components/aihsafe/common/apiClient";
import { PendingAttention }           from "@/components/aihsafe/founder/PendingAttention";
import { FounderSettingsEditor }      from "@/components/aihsafe/founder/FounderSettingsEditor";
import { FamilySettingsView }         from "@/components/aihsafe/founder/FamilySettingsView";
import { OverviewOperationalHQ }      from "@/components/aihsafe/founder/OverviewOperationalHQ";
import { fetchNotices }                 from "@/lib/msg-vault/api-client";
import { QuickCreateModal }           from "@/components/aihsafe/dashboard/QuickCreateModal";
import { InvitePanel }                from "@/components/aihsafe/invite/InvitePanel";
import { TrustedSpaceCreateFlow }     from "@/components/aihsafe/spaces/TrustedSpaceCreateFlow";
import { FamilyGroupCreateFlow }      from "@/components/aihsafe/spaces/FamilyGroupCreateFlow";
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
import { VaultHeroSection, type VaultHeroUser } from "@/components/aihsafe/founder/VaultHero";
import { FamilySafeContextLayout } from "@/components/context-rail/FamilySafeContextLayout";
import { getActiveTrustUnits } from "@/lib/trust/display";

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
  /** Dashboard-aligned vault hero (avatar + optional cover). */
  heroUser?: VaultHeroUser | null;
  heroCoverUrl?: string | null;
}

const tabCard: React.CSSProperties = {
  background:   "#fff",
  borderRadius: 16,
  border:       "1px solid #e7e5e4",
  padding:      "22px 24px",
  marginBottom: 14,
};

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

export function FounderShell({
  currentUserId,
  shellMode = "founder",
  heroUser = null,
  heroCoverUrl = null,
}: Props) {
  const [familyUnits,   setFamilyUnits]   = useState<FamilyUnitDTO[]>([]);
  const [trustUnits,    setTrustUnits]    = useState<TrustUnitDTO[]>([]);
  const [approvals,     setApprovals]     = useState<ApprovalRequestDTO[]>([]);
  const [invites,       setInvites]       = useState<InviteDTO[]>([]);
  const [guardianLinks, setGuardianLinks] = useState<GuardianLinkDTO[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [loadError,     setLoadError]     = useState(false);
  const [modal,         setModal]         = useState<ModalKind>(null);
  const [activeTab,     setActiveTab]     = useState<TabId>(() => defaultTab(shellMode));
  const [activityTrustUnitFilter, setActivityTrustUnitFilter] = useState<string | null>(null);
  const [recentActivityStat, setRecentActivityStat] = useState<number | string>("…");
  const [unreadNotices, setUnreadNotices] = useState(0);

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

  useEffect(() => {
    listActivityFeed(undefined, { limit: 100 }).then((r) => {
      if (r.kind !== "ok") {
        setRecentActivityStat("—");
        return;
      }
      const n = r.data.items.length;
      setRecentActivityStat(r.data.pagination.hasMore ? `${n}+` : n);
    });
    fetchNotices()
      .then(({ unreadCount }) => setUnreadNotices(unreadCount))
      .catch(() => setUnreadNotices(0));
  }, []);

  function closeModal() { setModal(null); load(); }

  // ── Derived counts ──────────────────────────────────────────────────────────
  const pendingApprovals  = approvals.filter((a) => a.state === "pending");
  const pendingInvites    = invites.filter((i) => i.status === "PENDING");
  const mySpaces          = getActiveTrustUnits(trustUnits, currentUserId).filter((u) =>
    u.members.some((m) => m.userId === currentUserId && !m.exitedAt),
  );
  const trustedAdultCount = guardianLinks.filter((l) => !l.revokedAt).length;
  const membershipCount   = mySpaces.reduce(
    (sum, u) => sum + u.members.filter((m) => !m.exitedAt).length, 0
  );
  const isGuardian        = guardianLinks.some(
    (l) => !l.revokedAt && l.guardianUserId === currentUserId,
  );

  // ── Tab visibility + badges ─────────────────────────────────────────────────
  const visibleTabs  = getVisibleTabs(shellMode, isGuardian);
  const pendingCount = pendingApprovals.length + pendingInvites.length;

  useEffect(() => {
    const ids = visibleTabs.map((t) => t.id);
    if (!ids.includes(activeTab)) {
      setActiveTab(defaultTab(shellMode));
    }
  }, [visibleTabs, activeTab, shellMode]);

  return (
    <div className="app-page-shell--family-safe">

        {/* ════════════════════════════════════════════════════════
            HERO — varies by shellMode
            ════════════════════════════════════════════════════════ */}

        {(shellMode === "founder" || shellMode === "member") && (
          <>
            <VaultHeroSection
              variant="full"
              eyebrow="Family Safe"
              coverUrl={heroCoverUrl ?? null}
              heroUser={heroUser}
              title="Trusted Private Spaces"
              description="Governed circles for family and trusted groups."
              spacesCount={mySpaces.length}
              membersCount={membershipCount}
              loading={loading}
            />
          </>
        )}

        {shellMode === "child" && (
          <VaultHeroSection
            variant="compact"
            eyebrow="Family Safe"
            coverUrl={heroCoverUrl ?? null}
            heroUser={null}
            title="Trusted Private Spaces"
            description="Protected circles your family approves for you."
            spacesCount={0}
            membersCount={0}
            loading={false}
          />
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

        <FamilySafeContextLayout
          currentUserId={currentUserId}
          shellMode={shellMode}
          systemRole={heroUser?.role ?? "member"}
          isGuardian={isGuardian}
          trustUnits={trustUnits}
          pendingApprovalCount={pendingApprovals.length}
          pendingInviteCount={pendingInvites.length}
          spaceCount={mySpaces.length}
          trustedAdultCount={trustedAdultCount}
          unreadNotices={unreadNotices}
          membershipCount={membershipCount}
          recentInvites={invites.slice(0, 3)}
          recentActivityDisplay={recentActivityStat}
          onTabChange={setActiveTab}
          onInvite={() => setModal("invite")}
        >

        {/* ── OVERVIEW ──────────────────────────────────────────── */}
        <TabPanel id="overview" activeTab={activeTab}>
          <div style={{ maxWidth: 720 }}>
            <OverviewOperationalHQ
              shellMode={shellMode}
              currentUserId={currentUserId}
              isGuardian={isGuardian}
              loading={loading}
              trustUnits={trustUnits}
              familyUnits={familyUnits}
              guardianLinks={guardianLinks}
              invites={invites}
              pendingApprovals={pendingApprovals}
              mySpaces={mySpaces}
              unreadNotices={unreadNotices}
              onTabChange={setActiveTab}
              onInvite={() => setModal("invite")}
              onCreateSpace={() => setModal("space")}
              onCreateFamily={() => setModal("family")}
            />
          </div>
        </TabPanel>

        {/* ── ACTIVITY ──────────────────────────────────────────── */}
        <TabPanel id="activity" activeTab={activeTab}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <ActivityFeed
              currentUserId={currentUserId}
              trustUnits={trustUnits}
              viewerMode={shellMode}
              scopedTrustUnitId={activityTrustUnitFilter}
              onScopedTrustUnitChange={setActivityTrustUnitFilter}
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
            onOpenSpaceActivity={(id) => {
              setActivityTrustUnitFilter(id);
              setActiveTab("activity");
            }}
          />
        </TabPanel>

        {/* ── PEOPLE ────────────────────────────────────────────── */}
        <TabPanel id="members" activeTab={activeTab}>
          <PeopleTab
            currentUserId={currentUserId}
            shellMode={shellMode}
            trustUnits={trustUnits}
            familyUnits={familyUnits}
            guardianLinks={guardianLinks}
            invites={invites}
            loading={loading}
            onReload={load}
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
          <div style={{ maxWidth: 680 }}>
            {shellMode === "founder" ? (
              <FounderSettingsEditor />
            ) : (
              <FamilySettingsView shellMode={shellMode} isGuardian={isGuardian} />
            )}
          </div>
        </TabPanel>

        </FamilySafeContextLayout>

      {/* Quick-create modal */}
      {modal && (
        <QuickCreateModal
          title={
            modal === "family" ? "Create family group" :
            modal === "space"  ? "Create trusted space" :
                                 "Invite someone"
          }
          onClose={closeModal}
        >
          {modal === "family" && (
            <FamilyGroupCreateFlow
              currentUserId={currentUserId}
              trustUnits={trustUnits}
              familyUnits={familyUnits}
              guardianLinks={guardianLinks}
              onCreated={closeModal}
            />
          )}
          {modal === "space" && (
            <TrustedSpaceCreateFlow
              currentUserId={currentUserId}
              trustUnits={trustUnits}
              familyUnits={familyUnits}
              guardianLinks={guardianLinks}
              invites={invites}
              onCreated={closeModal}
            />
          )}
          {modal === "invite" && <InvitePanel />}
        </QuickCreateModal>
      )}
    </div>
  );
}
