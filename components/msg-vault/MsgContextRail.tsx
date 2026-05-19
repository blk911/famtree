"use client";

import Link from "next/link";
import { Bell, Shield, Users, MessageCircle } from "lucide-react";
import { ContextRailSection, ContextRailMetaList } from "@/components/vault/ContextRailSection";
import type { VaultNoticeItem } from "@/lib/msg-vault/api-client";
import {
  conversationKindLabel,
  formatVisibilityScope,
  noticeRequiresAction,
  participantDisplayName,
  participantReadLabel,
} from "@/lib/msg-vault/context/rail";
import { conversationLabel, formatRelativeTime } from "@/lib/msg-vault/display";
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
  relationshipContext,
  trustUnit,
  privateThreadsEnabled,
  currentUserId,
  selectedNotice,
  shellMode,
  loading,
}: Props) {
  if (selectedNotice) {
    return <NoticeContextRail notice={selectedNotice} shellMode={shellMode} />;
  }

  if (!conversation) {
    return <DefaultContextRail shellMode={shellMode} />;
  }

  const isDirect = conversation.kind === MsgConversationKind.DIRECT;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <ConversationSummaryRail
        conversation={conversation}
        participants={participants}
        currentUserId={currentUserId}
      />
      <GovernanceOverlayRail overlay={overlay} loading={loading} />
      {isDirect ? (
        <DirectChatContextRail
          conversation={conversation}
          participants={participants}
          overlay={overlay}
          relationshipContext={relationshipContext}
          currentUserId={currentUserId}
          shellMode={shellMode}
        />
      ) : (
        <ThreadContextRail
          conversation={conversation}
          participants={participants}
          trustUnit={trustUnit}
          relationshipContext={relationshipContext}
          privateThreadsEnabled={privateThreadsEnabled}
        />
      )}
      <FamilySafeHint shellMode={shellMode} />
    </div>
  );
}

function ConversationSummaryRail({
  conversation,
  participants,
  currentUserId,
}: {
  conversation: MsgConversationDTO;
  participants: MsgParticipantDTO[];
  currentUserId: string;
}) {
  const title = conversationLabel(conversation, currentUserId);
  const myParticipant = participants.find((p) => p.userId === currentUserId);

  return (
    <ContextRailSection
      title="Conversation"
      icon={<MessageCircle style={{ width: 16, height: 16, color: "#6366f1" }} />}
    >
      <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "#1c1917" }}>{title}</h3>
      <ContextRailMetaList
        items={[
          { label: "Kind", value: conversationKindLabel(conversation.kind) },
          { label: "Status", value: conversation.status.replace(/_/g, " ").toLowerCase() },
          {
            label: "Your read status",
            value: participantReadLabel(
              myParticipant ?? {
                id: "",
                conversationId: conversation.id,
                userId: currentUserId,
                role: "PARTICIPANT",
                status: "ACTIVE",
                joinedAt: "",
                lastReadAt: null,
                mutedAt: null,
              },
              conversation.lastMessageAt,
            ),
          },
          ...(conversation.lastMessageAt
            ? [{ label: "Last message", value: formatRelativeTime(conversation.lastMessageAt) }]
            : []),
        ]}
      />
    </ContextRailSection>
  );
}

function GovernanceOverlayRail({
  overlay,
  loading,
}: {
  overlay: GovernanceOverlayDTO | null;
  loading?: boolean;
}) {
  return (
    <ContextRailSection
      title="Why you have access"
      icon={<Shield style={{ width: 16, height: 16, color: "#6366f1" }} />}
    >
      {loading && !overlay ? (
        <p style={{ margin: 0, fontSize: 13, color: "#a8a29e" }}>Loading…</p>
      ) : overlay ? (
        <>
          <p style={{ margin: "0 0 10px", fontSize: 13, color: "#1c1917", lineHeight: 1.55 }}>
            {overlay.visibilityReason}
          </p>
          <ContextRailMetaList
            items={[
              ...(overlay.visibilityScope
                ? [{ label: "Visibility", value: formatVisibilityScope(overlay.visibilityScope) }]
                : []),
              ...(overlay.policySourceType
                ? [{ label: "Policy source", value: overlay.policySourceType.replace(/_/g, " ") }]
                : []),
              {
                label: "External links",
                value: overlay.externalSharingAllowed ? "Allowed by policy" : "Restricted",
              },
              {
                label: "Guardian visibility",
                value: overlay.guardianOversightActive ? "Active for this chat" : "Not active",
              },
              ...(overlay.escalationPending
                ? [{ label: "Approval", value: "Pending — conversation not fully active" }]
                : []),
            ]}
          />
        </>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: "#78716c", lineHeight: 1.5 }}>
          Governance details could not be loaded.
        </p>
      )}
    </ContextRailSection>
  );
}

function DirectChatContextRail({
  conversation,
  participants,
  overlay,
  relationshipContext,
  currentUserId,
  shellMode,
}: {
  conversation: MsgConversationDTO;
  participants: MsgParticipantDTO[];
  overlay: GovernanceOverlayDTO | null;
  relationshipContext: RelationshipContextDTO | null;
  currentUserId: string;
  shellMode: FamilySafeShellMode;
}) {
  const others = participants.filter((p) => p.userId !== currentUserId);
  const edges = relationshipContext?.edges ?? [];

  return (
    <>
      <ContextRailSection
        title="Participants"
        icon={<Users style={{ width: 16, height: 16, color: "#78716c" }} />}
      >
        <ParticipantList participants={participants} lastMessageAt={conversation.lastMessageAt} />
      </ContextRailSection>

      {edges.length > 0 && (
        <ContextRailSection title="Relationship">
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              fontSize: 12,
              color: "#57534e",
              lineHeight: 1.6,
            }}
          >
            {edges.map((edge) => (
              <li key={`${edge.kind}-${edge.label}`}>• {edge.label}</li>
            ))}
          </ul>
        </ContextRailSection>
      )}

      {overlay?.guardianOversightActive && (
        <ContextRailSection title="Guardian note">
          <p style={{ margin: 0, fontSize: 12, color: "#57534e", lineHeight: 1.55 }}>
            {shellMode === "child"
              ? "A parent or guardian may be able to see activity in this chat when family policies require it."
              : others.length > 0
                ? "Guardian visibility may apply when a minor is part of this conversation."
                : "Guardian oversight is enabled under your family policy."}
          </p>
        </ContextRailSection>
      )}
    </>
  );
}

function ThreadContextRail({
  conversation,
  participants,
  trustUnit,
  relationshipContext,
  privateThreadsEnabled,
}: {
  conversation: MsgConversationDTO;
  participants: MsgParticipantDTO[];
  trustUnit: TrustUnitContextDTO | null;
  relationshipContext: RelationshipContextDTO | null;
  privateThreadsEnabled: boolean;
}) {
  return (
    <>
      {trustUnit && (
        <ContextRailSection title="Trust unit">
          <ContextRailMetaList
            items={[
              { label: "Name", value: trustUnit.name ?? "Trust unit" },
              ...(trustUnit.vaultSpaceType
                ? [{ label: "Space type", value: trustUnit.vaultSpaceType.replace(/_/g, " ") }]
                : []),
              ...(trustUnit.defaultVisibilityScope
                ? [
                    {
                      label: "Default scope",
                      value: formatVisibilityScope(trustUnit.defaultVisibilityScope),
                    },
                  ]
                : []),
              {
                label: "Private threads",
                value: privateThreadsEnabled
                  ? "Enabled on this network"
                  : "Disabled by network settings",
              },
            ]}
          />
          {trustUnit.description ? (
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "#57534e", lineHeight: 1.5 }}>
              {trustUnit.description}
            </p>
          ) : null}
        </ContextRailSection>
      )}

      <ContextRailSection
        title="Participants"
        icon={<Users style={{ width: 16, height: 16, color: "#78716c" }} />}
      >
        <ParticipantList participants={participants} lastMessageAt={conversation.lastMessageAt} />
      </ContextRailSection>

      <ContextRailSection title="Thread settings">
        <ContextRailMetaList
          items={[
            {
              label: "Visibility scope",
              value: formatVisibilityScope(conversation.visibilityScope),
            },
            { label: "Conversation status", value: conversation.status.replace(/_/g, " ").toLowerCase() },
          ]}
        />
      </ContextRailSection>

      {relationshipContext && relationshipContext.edges.length > 0 && (
        <ContextRailSection title="Shared context">
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              fontSize: 12,
              color: "#57534e",
              lineHeight: 1.6,
            }}
          >
            {relationshipContext.edges.map((edge) => (
              <li key={`${edge.kind}-${edge.label}`}>• {edge.label}</li>
            ))}
          </ul>
        </ContextRailSection>
      )}
    </>
  );
}

function ParticipantList({
  participants,
  lastMessageAt,
}: {
  participants: MsgParticipantDTO[];
  lastMessageAt: string | null;
}) {
  if (participants.length === 0) {
    return <p style={{ margin: 0, fontSize: 12, color: "#a8a29e" }}>No participants listed.</p>;
  }

  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 12, color: "#57534e" }}>
      {participants.map((p) => (
        <li
          key={p.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            padding: "6px 0",
            borderBottom: "1px solid #f5f4f0",
          }}
        >
          <span>
            <strong>{participantDisplayName(p)}</strong>
            <span style={{ color: "#a8a29e", fontWeight: 500 }}> · {p.role.toLowerCase()}</span>
          </span>
          <span style={{ color: "#78716c", flexShrink: 0 }}>
            {participantReadLabel(p, lastMessageAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function NoticeContextRail({
  notice,
  shellMode,
}: {
  notice: VaultNoticeItem;
  shellMode: FamilySafeShellMode;
}) {
  const unread = notice.status === MsgNoticeStatus.UNREAD;
  const actionRequired = noticeRequiresAction(notice.kind);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <ContextRailSection
        title="Notice context"
        icon={<Bell style={{ width: 16, height: 16, color: "#7c3aed" }} />}
      >
        <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "#1c1917" }}>
          {notice.title}
        </h3>
        {actionRequired && (
          <p
            style={{
              margin: "0 0 10px",
              fontSize: 12,
              fontWeight: 600,
              color: "#b45309",
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: 8,
              padding: "8px 10px",
            }}
          >
            Action may be required — review this notice in Family Safe or via the link below.
          </p>
        )}
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "#57534e", lineHeight: 1.55 }}>
          {notice.body}
        </p>
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
              ? [{ label: "Conversation", value: "Linked to a thread" }]
              : []),
            ...(notice.trustUnitId ? [{ label: "Trust unit", value: "Linked" }] : []),
          ]}
        />
        {notice.contextLines.length > 0 && (
          <ul
            style={{
              margin: "12px 0 0",
              padding: 0,
              listStyle: "none",
              fontSize: 12,
              color: "#57534e",
              lineHeight: 1.65,
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
              marginTop: 14,
              fontSize: 13,
              fontWeight: 600,
              color: "#4f46e5",
            }}
          >
            Open related page →
          </Link>
        )}
      </ContextRailSection>
      <FamilySafeHint shellMode={shellMode} />
    </div>
  );
}

function DefaultContextRail({ shellMode }: { shellMode: FamilySafeShellMode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <ContextRailSection
        title="Governance context"
        icon={<Shield style={{ width: 16, height: 16, color: "#6366f1" }} />}
      >
        <p style={{ margin: 0, fontSize: 13, color: "#78716c", lineHeight: 1.5 }}>
          Select a conversation to see participants, trust context, and why you can participate.
          Msg Vault never offers open DMs or public discovery.
        </p>
      </ContextRailSection>
      <FamilySafeHint shellMode={shellMode} />
    </div>
  );
}

function FamilySafeHint({ shellMode }: { shellMode: FamilySafeShellMode }) {
  return (
    <div
      style={{
        background: "#f5f3ff",
        borderRadius: 12,
        border: "1px solid #e9d5ff",
        padding: "14px 16px",
        fontSize: 12,
        color: "#5b21b6",
        lineHeight: 1.5,
      }}
    >
      {shellMode === "child" ? (
        <>
          Messages here stay within approved family and trust relationships. Ask a guardian if you
          are unsure who you can talk to.
        </>
      ) : (
        <>
          Governed communication only — no stranger search, no open inbox. Manage policies in{" "}
          <Link href="/aihsafe" style={{ color: "#4f46e5", fontWeight: 600 }}>
            Family Safe
          </Link>
          .
        </>
      )}
    </div>
  );
}
