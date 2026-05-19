"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import type { FamilySafeShellMode } from "@/components/aihsafe/roles/shellMode";
import { MsgVaultTabs, type MsgVaultTabId } from "@/components/msg-vault/MsgVaultTabs";
import { MsgVaultThreadSelectorRail } from "@/components/msg-vault/MsgVaultThreadSelectorRail";
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
  startDirectConversation,
  type VaultNoticeItem,
} from "@/lib/msg-vault/api-client";
import { findDirectConversationByPeer } from "@/lib/msg-vault/directKey";
import type {
  GovernanceOverlayDTO,
  MsgConversationDTO,
  MsgMessageDTO,
  MsgParticipantDTO,
  RelationshipContextDTO,
  TrustUnitContextDTO,
} from "@/types/msg-vault";
import { MsgConversationKind } from "@/types/msg-vault";
import { prependVaultMessage } from "@/components/vault/vault-message-order";

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
  const searchParams = useSearchParams();
  const deepLinkPeerId = searchParams.get("peer")?.trim() || null;
  const deepLinkHandledRef = useRef(false);
  const conversationLoadSeqRef = useRef(0);

  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState<MsgVaultTabId>(() => {
    if (
      initialTab === "chats" ||
      initialTab === "threads" ||
      initialTab === "notices" ||
      initialTab === "overview"
    ) {
      return initialTab;
    }
    return deepLinkPeerId ? "chats" : "overview";
  });
  const [conversations, setConversations] = useState<MsgConversationDTO[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MsgMessageDTO[]>([]);
  const [overlay, setOverlay] = useState<GovernanceOverlayDTO | null>(null);
  const [participants, setParticipants] = useState<MsgParticipantDTO[]>([]);
  const [relationshipContext, setRelationshipContext] =
    useState<RelationshipContextDTO | null>(null);
  const [trustUnit, setTrustUnit] = useState<TrustUnitContextDTO | null>(null);
  const [privateThreadsEnabled, setPrivateThreadsEnabled] = useState(true);
  const [notices, setNotices] = useState<VaultNoticeItem[]>([]);
  const [unreadNotices, setUnreadNotices] = useState(0);
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null);
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
      const { items, unreadCount } = await fetchNotices();
      setNotices(items);
      setUnreadNotices(unreadCount);
    } catch {
      setNotices([]);
      setUnreadNotices(0);
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
    const loadSeq = ++conversationLoadSeqRef.current;
    setSelectedId(id);
    setLoadingMsgs(true);
    setOverlay(null);
    setRelationshipContext(null);
    setTrustUnit(null);
    setParticipants([]);
    try {
      setError("");
      const [detail, msgPage] = await Promise.all([
        fetchConversationDetail(id),
        fetchMessages(id, undefined, { limit: 100 }),
      ]);
      if (loadSeq !== conversationLoadSeqRef.current) return;
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...detail.conversation, participants: detail.participants } : c)),
      );
      setMessages(msgPage.items);
      setParticipants(detail.participants);
      setOverlay(detail.governanceOverlay);
      setRelationshipContext(detail.relationshipContext);
      setTrustUnit(detail.trustUnit);
      setPrivateThreadsEnabled(detail.privateThreadsEnabled);
    } catch (err) {
      if (loadSeq !== conversationLoadSeqRef.current) return;
      setMessages([]);
      setParticipants([]);
      setOverlay(null);
      setRelationshipContext(null);
      setTrustUnit(null);
      setError(err instanceof MsgVaultApiError ? err.message : "Could not load conversation.");
    } finally {
      if (loadSeq === conversationLoadSeqRef.current) setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== "notices") return;
    if (notices.length > 0 && !selectedNoticeId) {
      setSelectedNoticeId(notices[0].id);
    }
  }, [tab, notices, selectedNoticeId]);

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

  useEffect(() => {
    if (!deepLinkPeerId || deepLinkPeerId === currentUserId) return;
    if (loadingConvs || deepLinkHandledRef.current) return;

    const match = findDirectConversationByPeer(
      conversations,
      currentUserId,
      deepLinkPeerId,
    );
    if (match) {
      deepLinkHandledRef.current = true;
      setTab("chats");
      void selectConversation(match.id);
      return;
    }

    deepLinkHandledRef.current = true;
    setTab("chats");
    void (async () => {
      try {
        const conversation = await startDirectConversation(deepLinkPeerId);
        handleChatStarted(conversation);
      } catch (err) {
        setError(
          err instanceof MsgVaultApiError
            ? err.message
            : "Could not open a governed chat for this person.",
        );
        setStartChatOpen(true);
      }
    })();
  }, [
    conversations,
    currentUserId,
    deepLinkPeerId,
    loadingConvs,
    selectConversation,
    handleChatStarted,
  ]);

  const selectedNotice = useMemo(
    () => notices.find((n) => n.id === selectedNoticeId) ?? null,
    [notices, selectedNoticeId],
  );

  const directCount = conversations.filter((c) => c.kind === MsgConversationKind.DIRECT).length;
  const threadCount = conversations.filter((c) => c.kind !== MsgConversationKind.DIRECT).length;

  const kindFilter: "direct" | "thread" =
    tab === "chats" ? "direct" : "thread";

  function handleMessageSent(message: MsgMessageDTO) {
    setMessages((prev) => prependVaultMessage(prev, message));
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
            {unreadNotices > 0 && (
              <p style={{ margin: "10px 0 0", fontSize: 12, fontWeight: 600, color: "#fde68a" }}>
                {unreadNotices} unread notice{unreadNotices === 1 ? "" : "s"}
              </p>
            )}
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
        <div className="msg-vault-grid">
          <NoticesListPane
            notices={notices}
            loading={loadingNotices}
            shellMode={shellMode}
            selectedNoticeId={selectedNoticeId}
            onSelect={setSelectedNoticeId}
            onRead={(n: VaultNoticeItem) => {
              setNotices((prev) => prev.map((x) => (x.id === n.id ? n : x)));
              setUnreadNotices((c) => Math.max(0, c - 1));
            }}
          />
          <NoticesRailPane
            selectedNotice={selectedNotice}
            shellMode={shellMode}
            currentUserId={currentUserId}
          />
        </div>
      )}

      {showMessaging && (
        <div className="thread-hub-grid thread-hub-grid--vault">
          <div
            className="thread-hub-grid__main"
            style={{ ...card, display: "flex", flexDirection: "column", minHeight: 480 }}
          >
            <ConversationPanel
              conversation={selectedConversation}
              messages={messages}
              currentUserId={currentUserId}
              loading={loadingMsgs}
              onMessageSent={handleMessageSent}
            />
          </div>

          <div
            className="thread-hub-grid__rail"
            style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 480 }}
          >
            <MsgVaultThreadSelectorRail
              conversations={conversations}
              currentUserId={currentUserId}
              selectedId={selectedId}
              kindFilter={kindFilter}
              loading={loadingConvs}
              onSelect={(id) => void selectConversation(id)}
              onStartChat={tab === "chats" ? () => setStartChatOpen(true) : undefined}
            />
            <MsgContextRail
              conversation={selectedConversation}
              participants={
                participants.length > 0
                  ? participants
                  : selectedConversation?.participants ?? []
              }
              overlay={overlay}
              relationshipContext={relationshipContext}
              trustUnit={trustUnit}
              privateThreadsEnabled={privateThreadsEnabled}
              currentUserId={currentUserId}
              selectedNotice={null}
              shellMode={shellMode}
              loading={loadingMsgs && !!selectedId}
            />
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

function NoticesListPane({
  notices,
  loading,
  shellMode,
  selectedNoticeId,
  onSelect,
  onRead,
}: {
  notices: VaultNoticeItem[];
  loading: boolean;
  shellMode: FamilySafeShellMode;
  selectedNoticeId: string | null;
  onSelect: (id: string) => void;
  onRead: (notice: VaultNoticeItem) => void;
}) {
  return (
    <div className="msg-vault-grid__list" style={{ ...card, minHeight: 480 }}>
      <NoticesPanel
        notices={notices}
        loading={loading}
        shellMode={shellMode}
        selectedId={selectedNoticeId}
        onSelect={(n) => onSelect(n.id)}
        onRead={onRead}
      />
    </div>
  );
}

function NoticesRailPane({
  selectedNotice,
  shellMode,
  currentUserId,
}: {
  selectedNotice: VaultNoticeItem | null;
  shellMode: FamilySafeShellMode;
  currentUserId: string;
}) {
  return (
    <div className="msg-vault-grid__rail" style={{ minHeight: 480 }}>
      <MsgContextRail
        conversation={null}
        participants={[]}
        overlay={null}
        relationshipContext={null}
        trustUnit={null}
        privateThreadsEnabled={true}
        currentUserId={currentUserId}
        selectedNotice={selectedNotice}
        shellMode={shellMode}
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
