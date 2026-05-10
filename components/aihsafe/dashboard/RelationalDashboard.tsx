"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listFamilyUnits,
  listTrustUnits,
  listApprovals,
} from "@/components/aihsafe/common/apiClient";
import { HeroBar }            from "@/components/aihsafe/dashboard/HeroBar";
import { FamilySnapshot }     from "@/components/aihsafe/dashboard/FamilySnapshot";
import { SpacesSnapshot }     from "@/components/aihsafe/dashboard/SpacesSnapshot";
import { ActionCenter }       from "@/components/aihsafe/dashboard/ActionCenter";
import { ActivityFeed }       from "@/components/aihsafe/activity/ActivityFeed";
import { QuickCreateModal }   from "@/components/aihsafe/dashboard/QuickCreateModal";
import { MembershipPanel }    from "@/components/aihsafe/membership/MembershipPanel";
import { FamilyCreatePanel }  from "@/components/aihsafe/family/FamilyCreatePanel";
import { TrustUnitCreatePanel } from "@/components/aihsafe/trust-unit/TrustUnitCreatePanel";
import { InvitePanel }        from "@/components/aihsafe/invite/InvitePanel";
import { SectionHeader }      from "@/components/aihsafe/common/SectionHeader";

import type { FamilyUnitDTO, TrustUnitDTO, ApprovalRequestDTO } from "@/types/aihsafe/dto";

type ModalKind = "family" | "space" | "invite" | null;

interface Props {
  currentUserId: string;
}

const MODAL_TITLES: Record<Exclude<ModalKind, null>, string> = {
  family: "New family group",
  space:  "New trusted space",
  invite: "Invite someone",
};

export function RelationalDashboard({ currentUserId }: Props) {
  const [familyUnits,  setFamilyUnits]  = useState<FamilyUnitDTO[]>([]);
  const [trustUnits,   setTrustUnits]   = useState<TrustUnitDTO[]>([]);
  const [approvals,    setApprovals]    = useState<ApprovalRequestDTO[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState<ModalKind>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [fuR, tuR, apR] = await Promise.all([
      listFamilyUnits(),
      listTrustUnits(),
      listApprovals("pending"),
    ]);
    if (fuR.kind === "ok") setFamilyUnits(fuR.data.items);
    if (tuR.kind === "ok") setTrustUnits(tuR.data.items);
    if (apR.kind === "ok") setApprovals(apR.data.items);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function closeModal() {
    setModal(null);
    // Refresh dashboard counts after any create action.
    load();
  }

  const pendingApprovals = approvals.filter(a => a.state === "pending");

  return (
    <div
      style={{
        minHeight:       "100vh",
        background:      "#fafaf9",
        padding:         "24px 20px 48px",
        boxSizing:       "border-box",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Hero bar */}
        <HeroBar
          familyCount={familyUnits.length}
          spaceCount={trustUnits.filter(u =>
            u.members.some(m => m.userId === currentUserId && !m.exitedAt)
          ).length}
          pendingCount={pendingApprovals.length}
          onPendingClick={() => {
            const el = document.getElementById("action-center");
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />

        {/* 2-column grid */}
        <div
          style={{
            display:             "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,380px)",
            gap:                 20,
            alignItems:          "start",
          }}
          className="aihsafe-grid"
        >
          {/* LEFT — family snapshot + spaces + memberships */}
          <div>
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

            {/* Memberships — compact card wrapping existing panel */}
            <div
              style={{
                background:   "#fff",
                borderRadius: 16,
                border:       "1px solid #e7e5e4",
                padding:      "20px 22px",
                marginBottom: 14,
              }}
            >
              <SectionHeader title="Your Memberships" />
              <MembershipPanel currentUserId={currentUserId} />
            </div>
          </div>

          {/* RIGHT — action center */}
          <div id="action-center">
            <ActionCenter
              pendingApprovals={pendingApprovals}
              onInviteClick={() => setModal("invite")}
              onCreateFamilyClick={() => setModal("family")}
              onCreateSpaceClick={() => setModal("space")}
            />
          </div>
        </div>

        {/* Activity timeline */}
        <ActivityFeed />
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
