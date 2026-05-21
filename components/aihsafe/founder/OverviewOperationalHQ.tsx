"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SectionHeader } from "@/components/aihsafe/common/SectionHeader";
import { CompactActivityItem } from "@/components/aihsafe/common/CompactActivityItem";
import { OverviewCommandCard } from "@/components/aihsafe/founder/OverviewCommandCard";
import { ChildEscalationStatus } from "@/components/aihsafe/child/ChildEscalationStatus";
import { listActivityFeed, listApprovals, listMyEscalations } from "@/components/aihsafe/common/apiClient";
import { buildGovernedEvents } from "@/components/aihsafe/founder/overview/buildGovernedEvents";
import { buildPeopleSnapshot } from "@/components/aihsafe/founder/overview/buildPeopleSnapshot";
import type { TabId } from "@/components/aihsafe/navigation/FamilySafeTabs";
import type {
  ActivityPostDTO,
  ApprovalRequestDTO,
  FamilyUnitDTO,
  GuardianLinkDTO,
  InviteDTO,
  TrustUnitDTO,
} from "@/types/aihsafe/dto";
import {
  AihsafeOverview,
  AihsafeOverviewActionChip,
  AihsafeOverviewActions,
  AihsafeOverviewEmpty,
  AihsafeOverviewHint,
  AihsafeOverviewLinkBtn,
  AihsafeOverviewList,
  AihsafeOverviewMeta,
  AihsafeOverviewPeople,
  AihsafeOverviewPeopleItem,
  AihsafeOverviewRow,
  AihsafeOverviewSection,
  AihsafeOverviewSectionLink,
  AihsafeOverviewTwoCol,
} from "@/components/ui/aihsafe";
import type { FamilySafeShellMode } from "@/components/aihsafe/roles/shellMode";

export type OverviewHQProps = {
  shellMode: FamilySafeShellMode;
  currentUserId: string;
  isGuardian: boolean;
  loading: boolean;
  trustUnits: TrustUnitDTO[];
  familyUnits: FamilyUnitDTO[];
  guardianLinks: GuardianLinkDTO[];
  invites: InviteDTO[];
  pendingApprovals: ApprovalRequestDTO[];
  mySpaces: TrustUnitDTO[];
  unreadNotices: number;
  onTabChange: (tab: TabId) => void;
  onInvite: () => void;
  onCreateSpace: () => void;
  onCreateFamily: () => void;
};

function memberCount(unit: { members: { exitedAt: string | null }[] }): number {
  return unit.members.filter((m) => !m.exitedAt).length;
}

function trustSpaceLabel(tu: TrustUnitDTO): string {
  return tu.name?.trim() || tu.vaultSpaceType.replace(/_/g, " ");
}

export function OverviewOperationalHQ({
  shellMode,
  currentUserId,
  isGuardian,
  loading,
  trustUnits,
  familyUnits,
  guardianLinks,
  invites,
  pendingApprovals,
  mySpaces,
  unreadNotices,
  onTabChange,
  onInvite,
  onCreateSpace,
  onCreateFamily,
}: OverviewHQProps) {
  const pendingInvites = invites.filter((i) => i.status === "PENDING");
  const [activityPosts, setActivityPosts] = useState<ActivityPostDTO[]>([]);
  const [recentApprovals, setRecentApprovals] = useState<ApprovalRequestDTO[]>([]);
  const [childPendingCount, setChildPendingCount] = useState(0);

  useEffect(() => {
    void listActivityFeed(undefined, { limit: 8 }).then((r) => {
      if (r.kind === "ok") setActivityPosts(r.data.items);
    });
    if (shellMode === "founder" || isGuardian) {
      void listApprovals("approved").then((r) => {
        if (r.kind === "ok") setRecentApprovals(r.data.items.slice(0, 3));
      });
    }
    if (shellMode === "child") {
      void listMyEscalations("pending").then((r) => {
        if (r.kind === "ok") setChildPendingCount(r.data.items.length);
      });
    }
  }, [shellMode, isGuardian]);

  const people = useMemo(
    () => buildPeopleSnapshot(currentUserId, shellMode, trustUnits, familyUnits, guardianLinks),
    [currentUserId, shellMode, trustUnits, familyUnits, guardianLinks],
  );

  const governedEvents = useMemo(
    () =>
      buildGovernedEvents({
        invites: invites.slice(0, 6),
        pendingApprovals,
        recentApprovals,
        trustUnits: mySpaces.slice(0, 4),
        activityPosts,
      }),
    [invites, pendingApprovals, recentApprovals, mySpaces, activityPosts],
  );

  const showApprovalsAttention =
    shellMode === "founder" || (shellMode === "member" && isGuardian);
  const attentionExtras: string[] = [];
  if (shellMode === "child" && childPendingCount > 0) {
    attentionExtras.push(`${childPendingCount} request${childPendingCount === 1 ? "" : "s"} awaiting guardian OK`);
  }
  if (unreadNotices > 0) {
    attentionExtras.push(`${unreadNotices} Msg Vault notice${unreadNotices === 1 ? "" : "s"}`);
  }

  const activeSpaces = [
    ...mySpaces.map((tu) => ({ key: tu.id, kind: "trust" as const, unit: tu })),
    ...familyUnits
      .filter((fu) => fu.status === "active")
      .map((fu) => ({ key: fu.id, kind: "family" as const, unit: fu })),
  ];

  const suggestedActions = buildSuggestedActions({
    shellMode,
    isGuardian,
    pendingApprovalCount: pendingApprovals.length,
    spaceCount: activeSpaces.length,
    trustedAdultCount: people.trustedAdults.length,
    onTabChange,
    onInvite,
    onCreateSpace,
    onCreateFamily,
  });

  if (shellMode === "child") {
    return (
      <AihsafeOverview>
        <OverviewCommandCard
          pendingApprovalCount={childPendingCount}
          pendingInviteCount={0}
          loading={loading}
          onReviewApprovals={() => onTabChange("activity")}
        />
        <AihsafeOverviewSection>
          <SectionHeader title="Your approved spaces" />
          {loading ? (
            <AihsafeOverviewEmpty>Loading…</AihsafeOverviewEmpty>
          ) : mySpaces.length === 0 ? (
            <AihsafeOverviewEmpty>
              No active spaces yet. Ask your family steward to add you to a trusted space.
            </AihsafeOverviewEmpty>
          ) : (
            <AihsafeOverviewList>
              {mySpaces.map((tu) => (
                <li key={tu.id}>
                  <AihsafeOverviewRow type="button" onClick={() => onTabChange("spaces")}>
                    <span>🤝 {trustSpaceLabel(tu)}</span>
                    <AihsafeOverviewMeta>{memberCount(tu)} members</AihsafeOverviewMeta>
                  </AihsafeOverviewRow>
                </li>
              ))}
            </AihsafeOverviewList>
          )}
        </AihsafeOverviewSection>
        <AihsafeOverviewSection>
          <SectionHeader title="Boundaries" />
          <AihsafeOverviewHint>
            Your family steward sets Msg Rules and boundaries. View them under the Boundaries tab.
          </AihsafeOverviewHint>
          <AihsafeOverviewLinkBtn onClick={() => onTabChange("settings")}>
            View Boundaries →
          </AihsafeOverviewLinkBtn>
        </AihsafeOverviewSection>
        <AihsafeOverviewSection>
          <SectionHeader title="Your requests" />
          <ChildEscalationStatus />
        </AihsafeOverviewSection>
      </AihsafeOverview>
    );
  }

  return (
    <AihsafeOverview>
      {showApprovalsAttention && (
        <div className="mb-1">
          <OverviewCommandCard
            pendingApprovalCount={pendingApprovals.length}
            pendingInviteCount={pendingInvites.length}
            loading={loading}
            onReviewApprovals={() => onTabChange("approvals")}
          />
          {!loading && attentionExtras.length > 0 && (
            <p className="-mt-1.5 mb-2.5 text-xs leading-snug text-stone-500">{attentionExtras.join(" · ")}</p>
          )}
        </div>
      )}

      {!showApprovalsAttention && shellMode === "member" && (
        <OverviewCommandCard
          pendingApprovalCount={0}
          pendingInviteCount={pendingInvites.length}
          loading={loading}
          onReviewApprovals={() => onTabChange("spaces")}
        />
      )}

      <AihsafeOverviewSection>
        <SectionHeader
          title="Active spaces"
          action={
            <AihsafeOverviewSectionLink onClick={() => onTabChange("spaces")}>
              All spaces →
            </AihsafeOverviewSectionLink>
          }
        />
        {loading ? (
          <AihsafeOverviewEmpty>Loading…</AihsafeOverviewEmpty>
        ) : activeSpaces.length === 0 ? (
          <AihsafeOverviewEmpty>
            No active spaces yet. Invite someone or create a trusted space.
          </AihsafeOverviewEmpty>
        ) : (
          <AihsafeOverviewList>
            {activeSpaces.slice(0, 6).map((row) => {
              const name =
                row.kind === "trust"
                  ? trustSpaceLabel(row.unit as TrustUnitDTO)
                  : (row.unit as FamilyUnitDTO).name;
              const count = memberCount(row.unit);
              const lastAt =
                row.kind === "trust"
                  ? (row.unit as TrustUnitDTO).createdAt
                  : (row.unit as FamilyUnitDTO).createdAt;
              return (
                <li key={row.key}>
                  <AihsafeOverviewRow type="button" onClick={() => onTabChange("spaces")}>
                    <span>
                      {row.kind === "trust" ? "🤝" : "🏠"} {name}
                    </span>
                    <AihsafeOverviewMeta>
                      {count} {count === 1 ? "member" : "members"}
                      {lastAt ? ` · ${formatShortDate(lastAt)}` : ""}
                    </AihsafeOverviewMeta>
                  </AihsafeOverviewRow>
                </li>
              );
            })}
          </AihsafeOverviewList>
        )}
      </AihsafeOverviewSection>

      <AihsafeOverviewTwoCol>
        <AihsafeOverviewSection>
          <SectionHeader
            title="People snapshot"
            action={
              <AihsafeOverviewSectionLink onClick={() => onTabChange("members")}>
                All people →
              </AihsafeOverviewSectionLink>
            }
          />
          {loading ? (
            <AihsafeOverviewEmpty>Loading…</AihsafeOverviewEmpty>
          ) : (
            <PeopleSnapshotBlock people={people} shellMode={shellMode} onInvite={onInvite} />
          )}
        </AihsafeOverviewSection>

        <AihsafeOverviewSection>
          <SectionHeader
            title="Recent governed activity"
            action={
              <AihsafeOverviewSectionLink onClick={() => onTabChange("activity")}>
                Activity →
              </AihsafeOverviewSectionLink>
            }
          />
          {governedEvents.length === 0 ? (
            <AihsafeOverviewEmpty>No recent governed activity yet.</AihsafeOverviewEmpty>
          ) : (
            governedEvents.map((ev) => (
              <CompactActivityItem key={ev.id} icon={ev.icon} label={ev.label} time={ev.time} />
            ))
          )}
        </AihsafeOverviewSection>
      </AihsafeOverviewTwoCol>

      <AihsafeOverviewSection>
        <SectionHeader title="Suggested actions" />
        <AihsafeOverviewActions>
          {suggestedActions.map((a) => (
            <AihsafeOverviewActionChip key={a.label} onClick={a.onClick}>
              <span>{a.icon}</span>
              <span>{a.label}</span>
            </AihsafeOverviewActionChip>
          ))}
          <AihsafeOverviewActionChip link href="/msg-vault">
            <span>💬</span>
            <span>
              Open Msg Vault
              {unreadNotices > 0 ? ` (${unreadNotices})` : ""}
            </span>
          </AihsafeOverviewActionChip>
        </AihsafeOverviewActions>
      </AihsafeOverviewSection>
    </AihsafeOverview>
  );
}

function PeopleSnapshotBlock({
  people,
  shellMode,
  onInvite,
}: {
  people: ReturnType<typeof buildPeopleSnapshot>;
  shellMode: FamilySafeShellMode;
  onInvite: () => void;
}) {
  const total =
    (people.steward ? 1 : 0) +
    people.children.length +
    people.trustedAdults.length +
    people.adults.length;

  if (total === 0) {
    return (
      <>
        <AihsafeOverviewEmpty>Invite your first trusted person.</AihsafeOverviewEmpty>
        {shellMode === "founder" && (
          <AihsafeOverviewLinkBtn onClick={onInvite}>
            Invite someone →
          </AihsafeOverviewLinkBtn>
        )}
      </>
    );
  }

  return (
    <AihsafeOverviewPeople>
      {people.steward && (
        <li>
          <strong>{people.steward.name}</strong>
          <span>{people.steward.detail}</span>
        </li>
      )}
      {people.children.map((p) => (
        <li key={p.id}>
          <strong>{p.name}</strong>
          <span>{p.detail}</span>
        </li>
      ))}
      {people.trustedAdults.map((p) => (
        <li key={p.id}>
          <strong>{p.name}</strong>
          <span>{p.detail}</span>
        </li>
      ))}
      {people.adults.slice(0, 4).map((p) => (
        <li key={p.id}>
          <strong>{p.name}</strong>
          <span>{p.detail}</span>
        </li>
      ))}
    </AihsafeOverviewPeople>
  );
}

function buildSuggestedActions(input: {
  shellMode: FamilySafeShellMode;
  isGuardian: boolean;
  pendingApprovalCount: number;
  spaceCount: number;
  trustedAdultCount: number;
  onTabChange: (tab: TabId) => void;
  onInvite: () => void;
  onCreateSpace: () => void;
  onCreateFamily: () => void;
}): { icon: string; label: string; onClick: () => void }[] {
  const out: { icon: string; label: string; onClick: () => void }[] = [];

  if (input.pendingApprovalCount > 0 && (input.shellMode === "founder" || input.isGuardian)) {
    out.push({
      icon: "⏳",
      label: "Review approvals",
      onClick: () => input.onTabChange("approvals"),
    });
  }

  if (input.shellMode === "founder" || input.isGuardian) {
    out.push({ icon: "📨", label: "Invite trusted person", onClick: input.onInvite });
  }

  if (input.shellMode === "founder" && input.spaceCount === 0) {
    out.push({ icon: "🤝", label: "Create trusted space", onClick: input.onCreateSpace });
    out.push({ icon: "🏠", label: "Create family group", onClick: input.onCreateFamily });
  }

  if (input.shellMode === "founder" && input.trustedAdultCount === 0) {
    out.push({
      icon: "🛡",
      label: "Add trusted adult",
      onClick: () => input.onTabChange("members"),
    });
  }

  return out.slice(0, 4);
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}
