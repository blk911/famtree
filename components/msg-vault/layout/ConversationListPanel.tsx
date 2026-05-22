"use client";

import type { MsgVaultTabId } from "@/components/msg-vault/MsgVaultTabs";
import { ConversationListRow } from "@/components/msg-vault/layout/ConversationListRow";
import {
  CommunicationListEmpty,
  CommunicationListHeader,
  CommunicationListNewAction,
  CommunicationListPane,
  CommunicationListScroll,
} from "@/components/ui/msg-vault";
import {
  ThreadSelectorRow as UiThreadSelectorRow,
  ThreadSelectorRowLabel,
  ThreadUnreadDot,
} from "@/components/ui/thread";
import { conversationUnreadCount } from "@/components/vault/conversation-unread";
import { conversationLabel, formatRelativeTime } from "@/lib/msg-vault/display";
import { noticeRequiresAction } from "@/lib/msg-vault/context/rail";
import type { AllowedChatContact, VaultNoticeItem } from "@/lib/msg-vault/api-client";
import type { MsgConversationDTO } from "@/types/msg-vault";
import { MsgConversationKind, MsgNoticeStatus } from "@/types/msg-vault";

function sortByActivity(conversations: MsgConversationDTO[]): MsgConversationDTO[] {
  return [...conversations].sort((a, b) => {
    const ta = new Date(a.lastMessageAt ?? a.updatedAt).getTime();
    const tb = new Date(b.lastMessageAt ?? b.updatedAt).getTime();
    return tb - ta;
  });
}

function otherParticipant(conv: MsgConversationDTO, currentUserId: string) {
  return conv.participants?.find((p) => p.userId !== currentUserId && p.status === "ACTIVE");
}

export function ConversationListPanel({
  filter,
  currentUserId,
  directConversations,
  threadConversations,
  contacts,
  notices,
  selectedConversationId,
  selectedNoticeId,
  loading,
  onSelectConversation,
  onOpenContact,
  onSelectNotice,
  onStartChat,
}: {
  filter: MsgVaultTabId;
  currentUserId: string;
  directConversations: MsgConversationDTO[];
  threadConversations: MsgConversationDTO[];
  contacts: AllowedChatContact[];
  notices: VaultNoticeItem[];
  selectedConversationId: string | null;
  selectedNoticeId: string | null;
  loading?: boolean;
  onSelectConversation: (id: string) => void;
  onOpenContact: (userId: string, existingConversationId: string | null) => void;
  onSelectNotice: (id: string) => void;
  onStartChat: () => void;
}) {
  const header =
    filter === "chats" ? "Chats" : filter === "threads" ? "Threads" : "Notices";

  return (
    <CommunicationListPane>
      <CommunicationListHeader>
        <span className="text-[11px] font-bold uppercase tracking-wide text-stone-500">
          {header}
        </span>
        {filter === "chats" ? (
          <CommunicationListNewAction type="button" onClick={onStartChat}>
            New
          </CommunicationListNewAction>
        ) : null}
      </CommunicationListHeader>

      <CommunicationListScroll>
        {loading ? (
          <CommunicationListEmpty>Loading…</CommunicationListEmpty>
        ) : filter === "chats" ? (
          <ChatsList
            conversations={sortByActivity(directConversations)}
            contacts={contacts}
            currentUserId={currentUserId}
            selectedConversationId={selectedConversationId}
            onSelectConversation={onSelectConversation}
            onOpenContact={onOpenContact}
          />
        ) : filter === "threads" ? (
          <ThreadsList
            conversations={sortByActivity(threadConversations)}
            currentUserId={currentUserId}
            selectedConversationId={selectedConversationId}
            onSelect={onSelectConversation}
          />
        ) : (
          <NoticesList
            notices={notices}
            selectedNoticeId={selectedNoticeId}
            onSelect={onSelectNotice}
          />
        )}
      </CommunicationListScroll>
    </CommunicationListPane>
  );
}

function ChatsList({
  conversations,
  contacts,
  currentUserId,
  selectedConversationId,
  onSelectConversation,
  onOpenContact,
}: {
  conversations: MsgConversationDTO[];
  contacts: AllowedChatContact[];
  currentUserId: string;
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onOpenContact: (userId: string, existingConversationId: string | null) => void;
}) {
  const convIds = new Set(conversations.map((c) => c.id));
  const contactOnly = contacts.filter(
    (c) =>
      !c.existingConversationId ||
      !convIds.has(c.existingConversationId),
  );

  if (conversations.length === 0 && contactOnly.length === 0) {
    return <CommunicationListEmpty>No conversations yet.</CommunicationListEmpty>;
  }

  return (
    <>
      {conversations.map((conv) => {
        const other = otherParticipant(conv, currentUserId);
        const user = other?.user;
        const label = conversationLabel(conv, currentUserId);
        const firstName = user?.firstName ?? label.split(" ")[0] ?? "?";
        const lastName = user?.lastName ?? label.split(" ").slice(1).join(" ") ?? "";
        const preview = conv.lastMessageAt
          ? formatRelativeTime(conv.lastMessageAt)
          : "No messages yet";
        return (
          <ConversationListRow
            key={conv.id}
            title={label}
            preview={preview}
            firstName={firstName}
            lastName={lastName}
            photoUrl={user?.photoUrl ?? null}
            active={conv.id === selectedConversationId}
            unread={conversationUnreadCount(conv, currentUserId)}
            onClick={() => onSelectConversation(conv.id)}
          />
        );
      })}
      {contactOnly.map((c) => (
        <ConversationListRow
          key={c.userId}
          title={`${c.firstName} ${c.lastName}`.trim()}
          preview="Start chat"
          firstName={c.firstName}
          lastName={c.lastName}
          photoUrl={c.photoUrl}
          active={false}
          unread={0}
          onClick={() => onOpenContact(c.userId, c.existingConversationId)}
        />
      ))}
    </>
  );
}

function ThreadsList({
  conversations,
  currentUserId,
  selectedConversationId,
  onSelect,
}: {
  conversations: MsgConversationDTO[];
  currentUserId: string;
  selectedConversationId: string | null;
  onSelect: (id: string) => void;
}) {
  if (conversations.length === 0) {
    return <CommunicationListEmpty>No conversations yet.</CommunicationListEmpty>;
  }

  return (
    <>
      {conversations.map((conv) => {
        const label = conversationLabel(conv, currentUserId);
        const preview = conv.lastMessageAt
          ? formatRelativeTime(conv.lastMessageAt)
          : "No messages yet";
        return (
          <ConversationListRow
            key={conv.id}
            title={label}
            preview={preview}
            firstName={label.split(" ")[0] ?? "Thread"}
            lastName={label.split(" ").slice(1).join(" ") ?? ""}
            photoUrl={null}
            active={conv.id === selectedConversationId}
            unread={conversationUnreadCount(conv, currentUserId)}
            onClick={() => onSelect(conv.id)}
          />
        );
      })}
    </>
  );
}

function NoticesList({
  notices,
  selectedNoticeId,
  onSelect,
}: {
  notices: VaultNoticeItem[];
  selectedNoticeId: string | null;
  onSelect: (id: string) => void;
}) {
  if (notices.length === 0) {
    return <CommunicationListEmpty>No notices.</CommunicationListEmpty>;
  }

  return (
    <>
      {notices.map((n) => {
        const unread = n.status === MsgNoticeStatus.UNREAD;
        const action = noticeRequiresAction(n.kind);
        const preview = action ? "Action needed" : formatRelativeTime(n.createdAt);
        return (
          <UiThreadSelectorRow
            key={n.id}
            type="button"
            onClick={() => onSelect(n.id)}
            active={n.id === selectedNoticeId}
            compact
            className="!mx-0 !rounded-lg !px-2.5 !py-2"
            title={n.title}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-700">
              !
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[13px] font-semibold text-stone-900">
                {unread && <ThreadUnreadDot className="mr-1 inline-block" />}
                {n.title}
              </span>
              <span className="block truncate text-[11px] text-stone-500">{preview}</span>
            </span>
            <ThreadSelectorRowLabel className="!flex-none text-[10px] text-stone-400">
              {formatRelativeTime(n.createdAt)}
            </ThreadSelectorRowLabel>
          </UiThreadSelectorRow>
        );
      })}
    </>
  );
}
