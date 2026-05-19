"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import type { FamilySafeShellMode } from "@/components/aihsafe/roles/shellMode";
import { MsgVaultTabs, type MsgVaultTabId } from "@/components/msg-vault/MsgVaultTabs";
import { ConversationList } from "@/components/msg-vault/ConversationList";
import { ConversationPanel } from "@/components/msg-vault/ConversationPanel";
import { NoticesPanel } from "@/components/msg-vault/NoticesPanel";
import { MsgContextRail } from "@/components/msg-vault/MsgContextRail";
import { StartChatModal } from "@/components/msg-vault/StartChatModal";
import {
  fetchConversationDetail,
  fetchConversations,
  fetchMessages,
  fetchNotices,
  MsgVaultApiError,
} from "@/lib/msg-vault/api-client";
import type {
  GovernanceOverlayDTO,
  MsgConversationDTO,
  MsgMessageDTO,
  MsgNoticeDTO,
} from "@/types/msg-vault";
import { MsgConversationKind, MsgNoticeStatus } from "@/types/msg-vault";

const card: React.CSSProperties = {
  background:   "#fff",
  borderRadius: 16,
  border:       "1px solid #ece9e3",
  boxShadow:    "0 1px 4px rgba(0,0,0,0.05)",
  overflow:     "hidden",
};

interface Props {
  currentUserId: string;
  shellMode: FamilySafeShellMode;
  firstName: string;
  lastName: string;
}

export function MsgVaultShell({ currentUserId, shellMode, firstName, lastName }: Props) {
  const [tab, setTab] = useState<MsgVaultTabId>("overview");
  const [conversations, setConversations] = useState<MsgConversationDTO[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MsgMessageDTO[]>([]);
  const [overlay, setOverlay] = useState<GovernanceOverlayDTO | null>(null);
  const [notices, setNotices] = useState<MsgNoticeDTO[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [loadingNotices, setLoadingNotices] = useState(true);
  const [error, setError] = useState("");
  const [startChatOpen, setStartChatOpen] = useState(false);

  const loadConversations = useCallback(async () => {
    setLoadingConvs(true);
    setError("");
    try {
      const items = await fetchConversations();
      setConversations(items);
    } catch (err) {
      setError(err instanceof MsgVaultApiError ? err.message : "Could not load conversations.");
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  const loadNotices = useCallback(async () => {
    setLoadingNotices(true);
    try {
      const items = await fetchNotices();
      setNotices(items);
    } catch {
      setNotices([]);
    } finally {
      setLoadingNotices(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    loadNotices();
  }, [loadConversations, loadNotices]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const selectConversation = useCallback(async (id: string) => {
    setSelectedId(id);
    setLoadingMsgs(true);
    setOverlay(null);
    try {
      const [detail, msgPage] = await Promise.all([
        fetchConversationDetail(id),
        fetchMessages(id),
      ]);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...detail.conversation, participants: detail.participants } : c)),
      );
      setMessages(msgPage.items);
      setOverlay(detail.governanceOverlay);
    } catch (err) {
      setMessages([]);
      setError(err instanceof MsgVaultApiError ? err.message : "Could not load conversation.");
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== "chats" && tab !== "threads") return;
    const list = conversations.filter((c) =>
      tab === "chats"
        ? c.kind === MsgConversationKind.DIRECT
        : c.kind !== MsgConversationKind.DIRECT,
    );
    if (list.length > 0 && !selectedId) {
      void selectConversation(list[0].id);
    }
  }, [tab, conversations, selectedId, selectConversation]);

  const handleChatStarted = useCallback(
    (conversation: MsgConversationDTO) => {
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === conversation.id);
        if (exists) {
          return prev.map((c) => (c.id === conversation.id ? { ...c, ...conversation } : c));
        }
        return [conversation, ...prev];
      });
      setTab("chats");
      void selectConversation(conversation.id);
    },
    [selectConversation],
  );

  const unreadNotices = notices.filter((n) => n.status === MsgNoticeStatus.UNREAD).length;
  const directCount = conversations.filter((c) => c.kind === MsgConversationKind.DIRECT).length;
  const threadCount = conversations.filter((c) => c.kind !== MsgConversationKind.DIRECT).length;

  const kindFilter =
    tab === "chats" ? "direct" : tab === "threads" ? "thread" : "all";

  function handleMessageSent(message: MsgMessageDTO) {
    setMessages((prev) => [message, ...prev]);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === message.conversationId
          ? { ...c, lastMessageAt: message.createdAt, updatedAt: message.updatedAt }
          : c,
      ),
    );
  }

  const showMessaging = tab === "chats" || tab === "threads";

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Hero */}
      <header
        style={{
          marginBottom: 20,
          padding:      "24px 28px",
          borderRadius: 18,
          background:   "linear-gradient(135deg,#1a1a2e 0%,#312e81 55%,#4c1d95 100%)",
          color:        "white",
          boxShadow:    "0 4px 20px rgba(49,46,129,0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div
            style={{
              width:          44,
              height:         44,
              borderRadius:   12,
              background:     "rgba(255,255,255,0.12)",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              flexShrink:     0,
            }}
          >
            <Lock style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>
              Msg Vault
            </h1>
            <p style={{ margin: "6px 0 0", fontSize: 14, opacity: 0.88, lineHeight: 1.45 }}>
              Governed communication for {firstName} — relationship-scoped chats and threads only.
              No open DMs. No stranger discovery.
            </p>
          </div>
        </div>
      </header>

      <MsgVaultTabs
        active={tab}
        onChange={setTab}
        badges={{ notices: unreadNotices }}
      />

      {error && (
        <p
          style={{
            margin:       "0 0 12px",
            padding:      "10px 14px",
            borderRadius: 10,
            background:   "#fef2f2",
            border:       "1px solid #fecaca",
            color:        "#b91c1c",
            fontSize:     13,
          }}
        >
          {error}
        </p>
      )}

      {tab === "overview" && (
        <div style={{ ...card, padding: 24 }}>
          <p style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, color: "#1c1917" }}>
            Welcome back, {firstName}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Stat label="Direct chats" value={directCount} onClick={() => setTab("chats")} />
            <Stat label="Threads" value={threadCount} onClick={() => setTab("threads")} />
            <Stat label="Unread notices" value={unreadNotices} onClick={() => setTab("notices")} />
          </div>
          <p style={{ margin: "20px 0 0", fontSize: 13, color: "#78716c", lineHeight: 1.55 }}>
            {shellMode === "child"
              ? "You can message people your family trusts. If something needs a parent’s OK, you’ll see it under Notices."
              : "Start a chat from My Network or a trust unit — conversations only appear when a governed relationship already exists."}
          </p>
        </div>
      )}

      {tab === "notices" && (
        <div style={{ ...card, minHeight: 400 }}>
          <NoticesPanel
            notices={notices}
            loading={loadingNotices}
            shellMode={shellMode}
            onRead={(n) => setNotices((prev) => prev.map((x) => (x.id === n.id ? n : x)))}
          />
        </div>
      )}

      {showMessaging && (
        <div className="msg-vault-grid">
          <div style={{ ...card, padding: 10, minHeight: 480 }}>
            <div
              style={{
                display:    "flex",
                alignItems: "center",
                justifyContent: "space-between",
                margin:     "4px 8px 10px",
                gap:        8,
              }}
            >
              <p
                style={{
                  margin:        0,
                  fontSize:      11,
                  fontWeight:    700,
                  color:         "#78716c",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {tab === "chats" ? "Chats" : "Threads"}
              </p>
              {tab === "chats" && (
                <button
                  type="button"
                  onClick={() => setStartChatOpen(true)}
                  style={{
                    fontSize:     11,
                    fontWeight:   700,
                    color:        "#6366f1",
                    background:   "#eef2ff",
                    border:       "1px solid #c7d2fe",
                    borderRadius: 8,
                    padding:      "4px 8px",
                    cursor:       "pointer",
                  }}
                >
                  + Start chat
                </button>
              )}
            </div>
            <ConversationList
              conversations={conversations}
              currentUserId={currentUserId}
              selectedId={selectedId}
              onSelect={(id) => void selectConversation(id)}
              kindFilter={kindFilter}
              loading={loadingConvs}
              onStartChat={tab === "chats" ? () => setStartChatOpen(true) : undefined}
            />
          </div>

          <div style={{ ...card, display: "flex", flexDirection: "column", minHeight: 480 }}>
            <ConversationPanel
              conversation={selectedConversation}
              messages={messages}
              currentUserId={currentUserId}
              loading={loadingMsgs}
              onMessageSent={handleMessageSent}
            />
          </div>

          <div style={{ minHeight: 480 }}>
            <MsgContextRail overlay={overlay} shellMode={shellMode} loading={loadingMsgs && !!selectedId} />
          </div>
        </div>
      )}

      <StartChatModal
        open={startChatOpen}
        onClose={() => setStartChatOpen(false)}
        onStarted={handleChatStarted}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex:         1,
        minWidth:     100,
        padding:      "14px 16px",
        borderRadius: 12,
        border:       "1px solid #ece9e3",
        background:   "#fafaf9",
        cursor:       "pointer",
        textAlign:    "left",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800, color: "#1c1917" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#78716c", marginTop: 4 }}>{label}</div>
    </button>
  );
}
