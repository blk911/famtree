"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { FamilySafeShellMode } from "@/components/aihsafe/roles/shellMode";
import type { MsgVaultTabId } from "@/components/msg-vault/MsgVaultTabs";
import { MsgVaultLeftNav } from "@/components/msg-vault/MsgVaultLeftNav";
import { ConversationPanel } from "@/components/msg-vault/ConversationPanel";
import { NoticeDetailPanel } from "@/components/msg-vault/NoticeDetailPanel";
import { MsgVaultContextRail } from "@/components/msg-vault/rail/MsgVaultContextRail";
import { StartChatModal } from "@/components/msg-vault/StartChatModal";
import {
  fetchAllowedChatContacts,
  fetchConversationDetail,
  fetchConversations,
  fetchMessages,
  fetchNotices,
  MsgVaultApiError,
  startDirectConversation,
  type AllowedChatContact,
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
import { filterVisibleConversations } from "@/lib/msg-vault/conversation-display-guard";
import type { TrustUnitRowForGuard } from "@/lib/msg-vault/conversation-display-guard";

interface Props {
  currentUserId: string;
  shellMode: FamilySafeShellMode;
  firstName: string;
  trustUnits?: TrustUnitRowForGuard[];
}

export function MsgVaultShell({
  currentUserId,
  shellMode,
  firstName,
  trustUnits = [],
}: Props) {
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
  const [contacts, setContacts] = useState<AllowedChatContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
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

  useEffect(() => {
    if (tab !== "chats") return;
    let cancelled = false;
    setLoadingContacts(true);
    void (async () => {
      try {
        const list = await fetchAllowedChatContacts();
        if (!cancelled) setContacts(list);
      } catch {
        if (!cancelled) setContacts([]);
      } finally {
        if (!cancelled) setLoadingContacts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const visibleConversations = useMemo(
    () => filterVisibleConversations(conversations, currentUserId, trustUnits),
    [conversations, currentUserId, trustUnits],
  );

  const directConversations = useMemo(
    () => visibleConversations.filter((c) => c.kind === MsgConversationKind.DIRECT),
    [visibleConversations],
  );

  const threadConversations = useMemo(
    () => visibleConversations.filter((c) => c.kind !== MsgConversationKind.DIRECT),
    [visibleConversations],
  );

  useEffect(() => {
    if (!selectedId) return;
    if (!visibleConversations.some((c) => c.id === selectedId)) {
      setSelectedId(null);
      setMessages([]);
    }
  }, [selectedId, visibleConversations]);

  const selectedConversation = useMemo(
    () => visibleConversations.find((c) => c.id === selectedId) ?? null,
    [visibleConversations, selectedId],
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

  const handleOpenContact = useCallback(
    async (userId: string, existingConversationId: string | null) => {
      if (existingConversationId) {
        void selectConversation(existingConversationId);
        return;
      }
      const match = findDirectConversationByPeer(
        visibleConversations,
        currentUserId,
        userId,
      );
      if (match) {
        void selectConversation(match.id);
        return;
      }
      try {
        const conversation = await startDirectConversation(userId);
        handleChatStarted(conversation);
      } catch (err) {
        setError(
          err instanceof MsgVaultApiError
            ? err.message
            : "Could not open a governed chat for this person.",
        );
      }
    },
    [visibleConversations, currentUserId, selectConversation, handleChatStarted],
  );

  useEffect(() => {
    if (!deepLinkPeerId || deepLinkPeerId === currentUserId) return;
    if (loadingConvs || deepLinkHandledRef.current) return;

    const match = findDirectConversationByPeer(
      visibleConversations,
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
    visibleConversations,
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

  function handleNoticeRead(n: VaultNoticeItem) {
    setNotices((prev) => prev.map((x) => (x.id === n.id ? n : x)));
    setUnreadNotices((c) => Math.max(0, c - 1));
  }

  const contextRailProps = {
    tab,
    shellMode,
    currentUserId,
    trustUnits,
    conversation: tab === "chats" || tab === "threads" ? selectedConversation : null,
    participants:
      participants.length > 0
        ? participants
        : selectedConversation?.participants ?? [],
    overlay,
    relationshipContext,
    trustUnit,
    privateThreadsEnabled,
    selectedNotice: tab === "notices" ? selectedNotice : null,
    loadingContext: loadingMsgs && !!selectedId,
  };

  return (
    <div className="app-page-shell--msg-vault">
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

      <div className="msg-vault-workspace">
        <div className="msg-vault-workspace__nav">
          <MsgVaultLeftNav
            tab={tab}
            onTabChange={setTab}
            badges={{ notices: unreadNotices }}
            directCount={directConversations.length}
            threadCount={threadConversations.length}
            unreadNotices={unreadNotices}
            contacts={contacts}
            directConversations={directConversations}
            threadConversations={threadConversations}
            notices={notices}
            currentUserId={currentUserId}
            selectedConversationId={selectedId}
            selectedNoticeId={selectedNoticeId}
            loadingConvs={loadingConvs}
            loadingContacts={loadingContacts}
            loadingNotices={loadingNotices}
            onSelectConversation={(id) => void selectConversation(id)}
            onOpenContact={(userId, existingId) => void handleOpenContact(userId, existingId)}
            onStartChat={() => setStartChatOpen(true)}
            onNoticeSelect={setSelectedNoticeId}
          />
        </div>

        <div className="msg-vault-workspace__main">
          {tab === "overview" && (
            <div className="msg-vault-overview-center">
              <h2 className="msg-vault-overview-center__title">Welcome back, {firstName}</h2>
              <p className="msg-vault-overview-center__sub">Governed messaging workspace</p>
              <ul className="msg-vault-summary-rows">
                <li>
                  <button
                    type="button"
                    className="msg-vault-summary-row"
                    onClick={() => setTab("chats")}
                  >
                    <span>Direct chats</span>
                    <span className="msg-vault-summary-row__count">{directConversations.length}</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="msg-vault-summary-row"
                    onClick={() => setTab("threads")}
                  >
                    <span>Threads</span>
                    <span className="msg-vault-summary-row__count">{threadConversations.length}</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="msg-vault-summary-row"
                    onClick={() => setTab("notices")}
                  >
                    <span>Notices</span>
                    <span className="msg-vault-summary-row__count">{unreadNotices}</span>
                  </button>
                </li>
              </ul>
            </div>
          )}

          {tab === "chats" || tab === "threads" ? (
            <ConversationPanel
              conversation={selectedConversation}
              messages={messages}
              currentUserId={currentUserId}
              loading={loadingMsgs}
              onMessageSent={handleMessageSent}
            />
          ) : null}

          {tab === "notices" && (
            <NoticeDetailPanel
              notice={selectedNotice}
              loading={loadingNotices}
              onRead={handleNoticeRead}
            />
          )}
        </div>

        <div className="msg-vault-workspace__context">
          <MsgVaultContextRail {...contextRailProps} />
        </div>
      </div>

      <StartChatModal
        open={startChatOpen}
        onClose={() => setStartChatOpen(false)}
        onStarted={handleChatStarted}
      />
    </div>
  );
}
