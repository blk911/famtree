"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { ContextRail, ContextRailSection } from "@/components/context-rail";
import { MsgContextRail } from "@/components/msg-vault/MsgContextRail";
import type { MsgVaultTabId } from "@/components/msg-vault/MsgVaultTabs";
import type { VaultNoticeItem } from "@/lib/msg-vault/api-client";
import { noticeRequiresAction } from "@/lib/msg-vault/context/rail";
import { formatRelativeTime } from "@/lib/msg-vault/display";
import { getActiveTrustUnits } from "@/lib/trust/display";
import type { TrustUnitRowForGuard } from "@/lib/msg-vault/conversation-display-guard";
import type {
  GovernanceOverlayDTO,
  MsgConversationDTO,
  MsgParticipantDTO,
  RelationshipContextDTO,
  TrustUnitContextDTO,
} from "@/types/msg-vault";
import { MsgNoticeStatus } from "@/types/msg-vault";
import type { FamilySafeShellMode } from "@/components/aihsafe/roles/shellMode";
import { ContextRailMetaList } from "@/components/vault/ContextRailSection";

export type MsgVaultContextRailProps = {
  tab: MsgVaultTabId;
  shellMode: FamilySafeShellMode;
  currentUserId: string;
  trustUnits: TrustUnitRowForGuard[];
  conversation: MsgConversationDTO | null;
  participants: MsgParticipantDTO[];
  overlay: GovernanceOverlayDTO | null;
  relationshipContext: RelationshipContextDTO | null;
  trustUnit: TrustUnitContextDTO | null;
  privateThreadsEnabled: boolean;
  selectedNotice: VaultNoticeItem | null;
  loadingContext?: boolean;
};

export function MsgVaultContextRail(props: MsgVaultContextRailProps) {
  const {
    tab,
    currentUserId,
    trustUnits,
    conversation,
    participants,
    overlay,
    relationshipContext,
    trustUnit,
    privateThreadsEnabled,
    selectedNotice,
    shellMode,
    loadingContext,
  } = props;

  return (
    <ContextRail mode="vault">
      {tab === "overview" && (
        <OverviewContextRail trustUnits={trustUnits} currentUserId={currentUserId} />
      )}

      {tab === "notices" && <NoticeGovernanceRail notice={selectedNotice} />}

      {(tab === "chats" || tab === "threads") && (
        <>
          {conversation ? (
            <MsgContextRail
              conversation={conversation}
              participants={participants}
              overlay={overlay}
              relationshipContext={relationshipContext}
              trustUnit={trustUnit}
              privateThreadsEnabled={privateThreadsEnabled}
              currentUserId={currentUserId}
              selectedNotice={null}
              shellMode={shellMode}
              loading={loadingContext}
            />
          ) : (
            <IdleContextRail tab={tab} />
          )}
        </>
      )}
    </ContextRail>
  );
}

function OverviewContextRail({
  trustUnits,
  currentUserId,
}: {
  trustUnits: TrustUnitRowForGuard[];
  currentUserId: string;
}) {
  const activeSpaces = getActiveTrustUnits(trustUnits, currentUserId);
  if (activeSpaces.length === 0) {
    return (
      <ContextRailSection title="Context">
        <p style={{ margin: 0, fontSize: 11, color: "#a8a29e", lineHeight: 1.45 }}>
          Select a section to open a conversation.
        </p>
      </ContextRailSection>
    );
  }

  return (
    <ContextRailSection title="Trust spaces" count={activeSpaces.length}>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 11, color: "#57534e" }}>
        {activeSpaces.slice(0, 5).map((tu) => (
          <li key={tu.id} style={{ padding: "3px 0" }}>
            {tu.members
              .map((m) => (m as { user?: { firstName: string } }).user?.firstName)
              .filter(Boolean)
              .join(", ")}
          </li>
        ))}
      </ul>
    </ContextRailSection>
  );
}

function IdleContextRail({ tab }: { tab: "chats" | "threads" }) {
  return (
    <ContextRailSection title="Context">
      <p style={{ margin: 0, fontSize: 11, color: "#a8a29e", lineHeight: 1.45 }}>
        {tab === "chats" ? "Select a conversation." : "Select a thread."}
      </p>
    </ContextRailSection>
  );
}

function NoticeGovernanceRail({ notice }: { notice: VaultNoticeItem | null }) {
  if (!notice) {
    return (
      <ContextRailSection title="Context">
        <p style={{ margin: 0, fontSize: 11, color: "#a8a29e" }}>Select a notice.</p>
      </ContextRailSection>
    );
  }

  const unread = notice.status === MsgNoticeStatus.UNREAD;
  const actionRequired = noticeRequiresAction(notice.kind);

  return (
    <>
      <ContextRailSection
        title="Governance"
        icon={<Bell style={{ width: 14, height: 14, color: "#7c3aed" }} />}
      >
        {actionRequired && (
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 11,
              fontWeight: 600,
              color: "#b45309",
              lineHeight: 1.4,
            }}
          >
            Approval may be required.
          </p>
        )}
        <ContextRailMetaList
          items={[
            { label: "Kind", value: notice.kind.replace(/_/g, " ").toLowerCase() },
            { label: "Source", value: notice.source },
            { label: "When", value: formatRelativeTime(notice.createdAt) },
            { label: "Status", value: unread ? "Unread" : "Read" },
            ...(notice.approvalRequestId
              ? [{ label: "Approval", value: `Request ${notice.approvalRequestId.slice(0, 8)}…` }]
              : []),
            ...(notice.conversationId
              ? [{ label: "Conversation", value: "Linked" }]
              : []),
            ...(notice.trustUnitId ? [{ label: "Trust unit", value: "Linked" }] : []),
          ]}
        />
        {notice.contextLines.length > 0 && (
          <ul
            style={{
              margin: "8px 0 0",
              padding: 0,
              listStyle: "none",
              fontSize: 11,
              color: "#57534e",
              lineHeight: 1.45,
            }}
          >
            {notice.contextLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        {notice.href && (
          <Link
            href={notice.href}
            style={{
              display: "inline-block",
              marginTop: 10,
              fontSize: 11,
              fontWeight: 600,
              color: "#6366f1",
            }}
          >
            Open approval →
          </Link>
        )}
      </ContextRailSection>
    </>
  );
}
