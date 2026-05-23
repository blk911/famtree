"use client";

import Link from "next/link";
import { Bell, Users, MessageCircle } from "lucide-react";
import { ContextRailSection, ContextRailMetaList } from "@/components/vault/ContextRailSection";
import type { VaultNoticeItem } from "@/lib/msg-vault/api-client";
import {
  conversationKindLabel,
  formatVisibilityScope,
  noticeRequiresAction,
  participantDisplayName,
} from "@/lib/msg-vault/context/rail";
import type {
  GovernanceOverlayDTO,
  MsgConversationDTO,
  MsgParticipantDTO,
  RelationshipContextDTO,
  TrustUnitContextDTO,
} from "@/types/msg-vault";
import { MsgConversationKind, MsgNoticeStatus } from "@/types/msg-vault";
import type { FamilySafeShellMode } from "@/components/aihsafe/roles/shellMode";

interface Props {
  conversation: MsgConversationDTO | null;
  participants: MsgParticipantDTO[];
  overlay: GovernanceOverlayDTO | null;
  relationshipContext: RelationshipContextDTO | null;
  trustUnit: TrustUnitContextDTO | null;
  privateThreadsEnabled: boolean;
  currentUserId: string;
  selectedNotice: VaultNoticeItem | null;
  shellMode: FamilySafeShellMode;
  loading?: boolean;
}

export function MsgContextRail({
  conversation,
  participants,
  overlay,
  trustUnit,
  currentUserId,
  selectedNotice,
  loading,
}: Props) {
  if (selectedNotice) {
    return <NoticeContextRail notice={selectedNotice} />;
  }

  if (!conversation) {
    return null;
  }

  const isDirect = conversation.kind === MsgConversationKind.DIRECT;

  const policyItems = [
    { label: "Type", value: conversationKindLabel(conversation.kind) },
    {
      label: "Visibility",
      value: formatVisibilityScope(
        overlay?.visibilityScope ?? String(conversation.visibilityScope),
      ),
    },
    {
      label: "Policy",
      value: overlay?.guardianOversightActive ? "Guardian oversight on" : "Standard governed",
    },
  ];

  if (trustUnit?.name && !isDirect) {
    policyItems.unshift({ label: "Space", value: trustUnit.name });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <ContextRailSection
        title="Chat"
        icon={<MessageCircle style={{ width: 16, height: 16, color: "#6366f1" }} />}
      >
        {loading ? (
          <p style={{ margin: 0, fontSize: 11, color: "#a8a29e" }}>Loading…</p>
        ) : (
          <ContextRailMetaList items={policyItems} />
        )}
      </ContextRailSection>

      <ContextRailSection
        title="Participants"
        icon={<Users style={{ width: 16, height: 16, color: "#78716c" }} />}
      >
        <ParticipantList participants={participants} />
      </ContextRailSection>
    </div>
  );
}

function ParticipantList({ participants }: { participants: MsgParticipantDTO[] }) {
  if (participants.length === 0) {
    return <p style={{ margin: 0, fontSize: 12, color: "#a8a29e" }}>No participants listed.</p>;
  }

  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 12, color: "#57534e" }}>
      {participants.map((p) => (
        <li key={p.id} style={{ padding: "3px 0" }}>
          {participantDisplayName(p)}
        </li>
      ))}
    </ul>
  );
}

function NoticeContextRail({ notice }: { notice: VaultNoticeItem }) {
  const unread = notice.status === MsgNoticeStatus.UNREAD;
  const action = noticeRequiresAction(notice.kind);

  return (
    <ContextRailSection
      title="Notice"
      icon={<Bell style={{ width: 16, height: 16, color: "#6366f1" }} />}
    >
      <ContextRailMetaList
        items={[
          { label: "Status", value: unread ? "Unread" : "Read" },
          { label: "Action", value: action ? "Required" : "Info" },
        ]}
      />
      {notice.href ? (
        <Link
          href={notice.href}
          style={{
            display: "inline-block",
            marginTop: 8,
            fontSize: 11,
            fontWeight: 600,
            color: "#6366f1",
            textDecoration: "none",
          }}
        >
          Open related item →
        </Link>
      ) : null}
    </ContextRailSection>
  );
}
