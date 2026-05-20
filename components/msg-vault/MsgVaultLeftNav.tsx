"use client";

import type { MsgVaultTabId } from "@/components/msg-vault/MsgVaultTabs";
import { MsgVaultNavRow } from "@/components/msg-vault/MsgVaultNavRow";
import { ThreadSelectorList } from "@/components/vault/ThreadSelectorList";
import { ThreadSelectorRow } from "@/components/vault/ThreadSelectorRow";
import { conversationUnreadCount } from "@/components/vault/conversation-unread";
import { conversationLabel, formatRelativeTime } from "@/lib/msg-vault/display";
import { noticeRequiresAction } from "@/lib/msg-vault/context/rail";
import type { AllowedChatContact, VaultNoticeItem } from "@/lib/msg-vault/api-client";
import type { MsgConversationDTO } from "@/types/msg-vault";
import { MsgNoticeStatus } from "@/types/msg-vault";

const NAV_TABS: { id: MsgVaultTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "chats", label: "Chats" },
  { id: "threads", label: "Threads" },
  { id: "notices", label: "Notices" },
];

function tabCount(
  id: MsgVaultTabId,
  directCount: number,
  threadCount: number,
  noticeCount: number,
): number | undefined {
  if (id === "chats") return directCount;
  if (id === "threads") return threadCount;
  if (id === "notices") return noticeCount;
  return undefined;
}

export function MsgVaultLeftNav({
  tab,
  onTabChange,
  badges,
  directCount,
  threadCount,
  unreadNotices,
  contacts,
  directConversations,
  threadConversations,
  notices,
  currentUserId,
  selectedConversationId,
  selectedNoticeId,
  loadingConvs,
  loadingContacts,
  loadingNotices,
  onSelectConversation,
  onOpenContact,
  onStartChat,
  onNoticeSelect,
}: {
  tab: MsgVaultTabId;
  onTabChange: (tab: MsgVaultTabId) => void;
  badges?: Partial<Record<MsgVaultTabId, number>>;
  directCount: number;
  threadCount: number;
  unreadNotices: number;
  contacts: AllowedChatContact[];
  directConversations: MsgConversationDTO[];
  threadConversations: MsgConversationDTO[];
  notices: VaultNoticeItem[];
  currentUserId: string;
  selectedConversationId: string | null;
  selectedNoticeId: string | null;
  loadingConvs?: boolean;
  loadingContacts?: boolean;
  loadingNotices?: boolean;
  onSelectConversation: (id: string) => void;
  onOpenContact: (userId: string, existingConversationId: string | null) => void;
  onStartChat: () => void;
  onNoticeSelect: (id: string) => void;
}) {
  return (
    <div className="msg-vault-left-nav">
      <nav className="msg-vault-left-nav__tabs" role="tablist" aria-label="Msg Vault sections">
        {NAV_TABS.map(({ id, label }) => {
          const active = tab === id;
          const count = tabCount(id, directCount, threadCount, notices.length);
          const badge = badges?.[id];
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(id)}
              className={`msg-vault-left-nav__tab${active ? " msg-vault-left-nav__tab--active" : ""}`}
            >
              <span>
                {label}
                {count !== undefined && (
                  <span className="msg-vault-left-nav__tab-count"> ({count})</span>
                )}
              </span>
              {badge !== undefined && badge > 0 && id === "notices" && (
                <span className="msg-vault-left-nav__badge">{badge > 99 ? "99+" : badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="msg-vault-left-nav__body">
        {tab === "overview" && (
          <OverviewNavBody
            directCount={directCount}
            threadCount={threadCount}
            unreadNotices={unreadNotices}
            onOpenChats={() => onTabChange("chats")}
            onOpenThreads={() => onTabChange("threads")}
            onOpenNotices={() => onTabChange("notices")}
          />
        )}
        {tab === "chats" && (
          <ChatsNavBody
            contacts={contacts}
            directConversations={directConversations}
            currentUserId={currentUserId}
            selectedConversationId={selectedConversationId}
            loading={loadingContacts || loadingConvs}
            onOpenContact={onOpenContact}
            onStartChat={onStartChat}
          />
        )}
        {tab === "threads" && (
          <ThreadsNavBody
            threadConversations={threadConversations}
            currentUserId={currentUserId}
            selectedConversationId={selectedConversationId}
            loading={loadingConvs}
            onSelect={onSelectConversation}
          />
        )}
        {tab === "notices" && (
          <NoticesNavBody
            notices={notices}
            selectedNoticeId={selectedNoticeId}
            loading={loadingNotices}
            onSelect={onNoticeSelect}
          />
        )}
      </div>
    </div>
  );
}

function OverviewNavBody({
  directCount,
  threadCount,
  unreadNotices,
  onOpenChats,
  onOpenThreads,
  onOpenNotices,
}: {
  directCount: number;
  threadCount: number;
  unreadNotices: number;
  onOpenChats: () => void;
  onOpenThreads: () => void;
  onOpenNotices: () => void;
}) {
  return (
    <div>
      <MsgVaultNavRow label="Chats" count={directCount} onClick={onOpenChats} />
      <MsgVaultNavRow label="Threads" count={threadCount} onClick={onOpenThreads} />
      <MsgVaultNavRow
        label="Notices"
        count={unreadNotices}
        onClick={onOpenNotices}
        urgent={unreadNotices > 0}
      />
    </div>
  );
}

function ChatsNavBody({
  contacts,
  directConversations,
  currentUserId,
  selectedConversationId,
  loading,
  onOpenContact,
  onStartChat,
}: {
  contacts: AllowedChatContact[];
  directConversations: MsgConversationDTO[];
  currentUserId: string;
  selectedConversationId: string | null;
  loading?: boolean;
  onOpenContact: (userId: string, existingConversationId: string | null) => void;
  onStartChat: () => void;
}) {
  const rows = contacts.map((c) => {
    const conv =
      directConversations.find((d) => d.id === c.existingConversationId) ??
      directConversations.find((d) => d.participants?.some((p) => p.userId === c.userId));
    const convId = conv?.id ?? c.existingConversationId;
    return {
      userId: c.userId,
      firstName: c.firstName,
      lastName: c.lastName,
      photoUrl: c.photoUrl,
      unread: conv ? conversationUnreadCount(conv, currentUserId) : 0,
      isActive: !!convId && convId === selectedConversationId,
      existingConversationId: c.existingConversationId,
    };
  });

  return (
    <>
      <p className="msg-vault-nav-section-label">People</p>
      <button type="button" className="msg-vault-nav-action" onClick={onStartChat}>
        + New chat
      </button>
      {loading ? (
        <p className="msg-vault-nav-empty">Loading…</p>
      ) : contacts.length === 0 ? (
        <p className="msg-vault-nav-empty">No trusted conversations yet.</p>
      ) : (
        <ThreadSelectorList>
          {rows.map((row) => (
            <ThreadSelectorRow
              key={row.userId}
              label={`${row.firstName} ${row.lastName}`}
              firstName={row.firstName}
              lastName={row.lastName}
              photoUrl={row.photoUrl}
              active={row.isActive}
              unread={row.unread}
              showChatIcon={false}
              onClick={() => onOpenContact(row.userId, row.existingConversationId)}
              title={`Chat with ${row.firstName}`}
            />
          ))}
        </ThreadSelectorList>
      )}
    </>
  );
}

function ThreadsNavBody({
  threadConversations,
  currentUserId,
  selectedConversationId,
  loading,
  onSelect,
}: {
  threadConversations: MsgConversationDTO[];
  currentUserId: string;
  selectedConversationId: string | null;
  loading?: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <p className="msg-vault-nav-section-label">Threads</p>
      {loading ? (
        <p className="msg-vault-nav-empty">Loading…</p>
      ) : threadConversations.length === 0 ? (
        <p className="msg-vault-nav-empty">No private threads yet.</p>
      ) : (
        <ThreadSelectorList>
          {threadConversations.map((conv) => {
            const label = conversationLabel(conv, currentUserId);
            return (
              <ThreadSelectorRow
                key={conv.id}
                label={label}
                firstName={label.split(" ")[0] ?? "Thread"}
                lastName={label.split(" ").slice(1).join(" ")}
                photoUrl={null}
                active={conv.id === selectedConversationId}
                unread={conversationUnreadCount(conv, currentUserId)}
                showChatIcon={false}
                onClick={() => onSelect(conv.id)}
                title={`Open ${label}`}
              />
            );
          })}
        </ThreadSelectorList>
      )}
    </>
  );
}

function NoticesNavBody({
  notices,
  selectedNoticeId,
  loading,
  onSelect,
}: {
  notices: VaultNoticeItem[];
  selectedNoticeId: string | null;
  loading?: boolean;
  onSelect: (id: string) => void;
}) {
  if (loading) {
    return <p className="msg-vault-nav-empty">Loading…</p>;
  }
  if (notices.length === 0) {
    return <p className="msg-vault-nav-empty">No notices.</p>;
  }

  return (
    <ThreadSelectorList>
      {notices.map((n) => {
        const unread = n.status === MsgNoticeStatus.UNREAD;
        const action = noticeRequiresAction(n.kind);
        const active = n.id === selectedNoticeId;
        return (
          <button
            key={n.id}
            type="button"
            onClick={() => onSelect(n.id)}
            className={`thread-selector-row${active ? " thread-selector-row--active" : ""}`}
            style={{ width: "100%", fontFamily: "inherit" }}
            title={n.title}
          >
            <span className="thread-selector-row__label" style={{ flex: 1, textAlign: "left" }}>
              {unread && <span className="thread-selector-unread-dot" style={{ marginRight: 6 }} />}
              {n.title}
            </span>
            <span style={{ fontSize: 10, color: "#a8a29e", flexShrink: 0 }}>
              {action ? "!" : formatRelativeTime(n.createdAt)}
            </span>
          </button>
        );
      })}
    </ThreadSelectorList>
  );
}
