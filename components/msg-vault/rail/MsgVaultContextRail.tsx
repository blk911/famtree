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
            <IdlePeopleRail trustUnits={trustUnits} currentUserId={currentUserId} tab={tab} />
          )}
        </>
      )}
    </ContextRail>
  );
}

function IdlePeopleRail({
  trustUnits,
  currentUserId,
  tab,
}: {
  trustUnits: TrustUnitRowForGuard[];
  currentUserId: string;
  tab: "chats" | "threads";
}) {
  const activeSpaces = getActiveTrustUnits(trustUnits, currentUserId);

  return (
    <>
      <ContextRailSection title="People">
        <p className="m-0 text-[11px] leading-snug text-stone-500">
          {tab === "chats"
            ? "Pick a chat to see members and trust context."
            : "Pick a thread to see members and trust context."}
        </p>
      </ContextRailSection>
      {activeSpaces.length > 0 ? (
        <ContextRailSection title="Trust spaces" count={activeSpaces.length}>
          <ul className="m-0 list-none p-0 text-[11px] text-stone-600">
            {activeSpaces.slice(0, 4).map((tu) => (
              <li key={tu.id} className="py-0.5">
                {tu.members
                  .map((m) => (m as { user?: { firstName: string } }).user?.firstName)
                  .filter(Boolean)
                  .join(", ")}
              </li>
            ))}
          </ul>
          <Link
            href="/aihsafe"
            className="mt-2 inline-block text-[10px] font-semibold text-indigo-600 hover:underline"
          >
            Family Safe →
          </Link>
        </ContextRailSection>
      ) : null}
    </>
  );
}

function NoticeGovernanceRail({ notice }: { notice: VaultNoticeItem | null }) {
  if (!notice) {
    return (
      <ContextRailSection title="Governance">
        <p className="m-0 text-[11px] text-stone-500">Select a notice.</p>
      </ContextRailSection>
    );
  }

  const unread = notice.status === MsgNoticeStatus.UNREAD;
  const actionRequired = noticeRequiresAction(notice.kind);

  return (
    <ContextRailSection
      title="Governance"
      icon={<Bell className="h-3.5 w-3.5 text-violet-600" />}
    >
      {actionRequired ? (
        <p className="m-0 mb-2 text-[11px] font-semibold text-amber-800 leading-snug">
          Approval may be required.
        </p>
      ) : null}
      <ContextRailMetaList
        items={[
          { label: "Kind", value: notice.kind.replace(/_/g, " ").toLowerCase() },
          { label: "Source", value: notice.source },
          { label: "When", value: formatRelativeTime(notice.createdAt) },
          { label: "Status", value: unread ? "Unread" : "Read" },
          ...(notice.approvalRequestId
            ? [{ label: "Approval", value: `Request ${notice.approvalRequestId.slice(0, 8)}…` }]
            : []),
          ...(notice.conversationId ? [{ label: "Chat", value: "Linked" }] : []),
          ...(notice.trustUnitId ? [{ label: "Trust space", value: "Linked" }] : []),
        ]}
      />
      {notice.contextLines.length > 0 ? (
        <ul className="m-2 mb-0 list-none p-0 text-[11px] leading-snug text-stone-600">
          {notice.contextLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      {notice.href ? (
        <Link
          href={notice.href}
          className="mt-2 inline-block text-[11px] font-semibold text-indigo-600 hover:underline"
        >
          Open approval →
        </Link>
      ) : null}
    </ContextRailSection>
  );
}
