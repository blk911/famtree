"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyThreadState } from "@/components/vault/EmptyThreadState";
import {
  ThreadActiveHeader,
  ThreadActivePanel,
  ThreadActiveTitle,
  ThreadBadge,
} from "@/components/ui/thread";
import { useDashboardPrivateThreads } from "@/components/vault/DashboardPrivateThreadsContext";
import { MessageComposer } from "@/components/msg-vault/MessageComposer";
import { VaultInlineError } from "@/components/vault/VaultInlineError";
import {
  prependVaultMessage,
  sortMessagesChronological,
} from "@/components/vault/vault-message-order";
import { conversationLabel } from "@/lib/msg-vault/display";
import { fetchMessages, MsgVaultApiError } from "@/lib/msg-vault/api-client";
import type { MsgMessageDTO } from "@/types/msg-vault";
import { MsgConversationKind } from "@/types/msg-vault";

type Props = {
  currentUserId: string;
  launchDmPeerId?: string | null;
  onLaunchDmPeerConsumed?: () => void;
  /** @deprecated Legacy props — ignored; vault is source of truth */
  trustUnits?: unknown;
  posts?: unknown;
  members?: unknown;
  bondPeers?: unknown;
  selectedThreadKey?: string | null;
  onSelectedThreadKeyChange?: (key: string | null) => void;
  onActiveDirectPeerChange?: (peerId: string | null) => void;
};

export function DashboardPrivateThreadCenter({
  currentUserId,
  launchDmPeerId = null,
  onLaunchDmPeerConsumed,
  onActiveDirectPeerChange,
}: Props) {
  const {
    conversations,
    loading: conversationsLoading,
    error: conversationsError,
    activeConversationId,
    openDirectPeer,
    refreshConversations,
    recordMessageSent,
  } = useDashboardPrivateThreads();

  const [messages, setMessages] = useState<MsgMessageDTO[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesLoadSeqRef = useRef(0);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  const loadMessages = useCallback(async (conversationId: string) => {
    const loadSeq = ++messagesLoadSeqRef.current;
    setMessagesLoading(true);
    setMessagesError(null);
    try {
      const result = await fetchMessages(conversationId, undefined, { limit: 100 });
      if (loadSeq !== messagesLoadSeqRef.current) return;
      setMessages(result.items);
    } catch (err) {
      if (loadSeq !== messagesLoadSeqRef.current) return;
      setMessages([]);
      setMessagesError(
        err instanceof MsgVaultApiError ? err.message : "Could not load messages.",
      );
    } finally {
      if (loadSeq === messagesLoadSeqRef.current) setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!launchDmPeerId || launchDmPeerId === currentUserId) return;
    void openDirectPeer(launchDmPeerId).then(() => onLaunchDmPeerConsumed?.());
  }, [launchDmPeerId, currentUserId, openDirectPeer, onLaunchDmPeerConsumed]);

  useEffect(() => {
    if (!onActiveDirectPeerChange) return;
    if (!activeConversation || activeConversation.kind !== MsgConversationKind.DIRECT) {
      onActiveDirectPeerChange(null);
      return;
    }
    const peer = activeConversation.participants?.find((p) => p.userId !== currentUserId);
    onActiveDirectPeerChange(peer?.userId ?? null);
  }, [activeConversation, currentUserId, onActiveDirectPeerChange]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      setMessagesError(null);
      return;
    }

    const loadSeq = ++messagesLoadSeqRef.current;
    setMessagesLoading(true);
    setMessagesError(null);

    void fetchMessages(activeConversationId, undefined, { limit: 100 })
      .then((result) => {
        if (loadSeq !== messagesLoadSeqRef.current) return;
        setMessages(result.items);
      })
      .catch((err) => {
        if (loadSeq !== messagesLoadSeqRef.current) return;
        setMessages([]);
        setMessagesError(
          err instanceof MsgVaultApiError ? err.message : "Could not load messages.",
        );
      })
      .finally(() => {
        if (loadSeq === messagesLoadSeqRef.current) setMessagesLoading(false);
      });
  }, [activeConversationId]);

  const ordered = useMemo(() => sortMessagesChronological(messages), [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ordered.length, activeConversationId]);

  const handleMessageSent = useCallback(
    (message: MsgMessageDTO) => {
      setMessages((cur) => prependVaultMessage(cur, message));
      recordMessageSent(message);
    },
    [recordMessageSent],
  );

  if (conversationsLoading && conversations.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "#a8a29e", margin: 0 }}>Loading private threads…</p>
    );
  }

  if (!conversationsLoading && conversationsError && conversations.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <VaultInlineError message={conversationsError} onRetry={() => void refreshConversations()} />
        <EmptyThreadState variant="no-threads" />
      </div>
    );
  }

  if (!conversationsLoading && conversations.length === 0) {
    return <EmptyThreadState variant="no-threads" />;
  }

  if (!activeConversationId || !activeConversation) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {conversationsError ? (
          <VaultInlineError message={conversationsError} onRetry={() => void refreshConversations()} />
        ) : null}
        <EmptyThreadState variant="pick" />
      </div>
    );
  }

  const title = conversationLabel(activeConversation, currentUserId);
  const closed =
    activeConversation.status === "ARCHIVED" ||
    activeConversation.status === "LOCKED" ||
    activeConversation.status === "PENDING_APPROVAL";

  const badge =
    activeConversation.kind === MsgConversationKind.DIRECT
      ? "Direct"
      : activeConversation.trustUnitId
        ? "Trust Unit"
        : "Thread";

  return (
    <ThreadActivePanel>
      <ThreadActiveHeader>
        <ThreadActiveTitle>{title}</ThreadActiveTitle>
        <ThreadBadge
          kind={activeConversation.kind === MsgConversationKind.DIRECT ? "direct" : "tu"}
        >
          {badge}
        </ThreadBadge>
      </ThreadActiveHeader>

      {(conversationsError || messagesError) && (
        <VaultInlineError
          message={messagesError ?? conversationsError ?? "Something went wrong."}
          onRetry={
            messagesError
              ? () => void loadMessages(activeConversation.id)
              : () => void refreshConversations()
          }
        />
      )}

      {closed && (
        <p style={{ fontSize: 12, color: "#b45309", margin: "0 0 8px" }}>
          This conversation is {activeConversation.status.toLowerCase().replace("_", " ")}.
        </p>
      )}

      <div
        style={{
          flex: 1,
          overflow: "auto",
          minHeight: 120,
          maxHeight: 360,
          marginBottom: 12,
          padding: "8px 0",
        }}
      >
        {messagesLoading ? (
          <p style={{ fontSize: 13, color: "#a8a29e", margin: 0 }}>Loading messages…</p>
        ) : ordered.length === 0 ? (
          <EmptyThreadState variant="no-messages" />
        ) : (
          ordered.map((msg) => {
            const mine = msg.authorId === currentUserId;
            return (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  justifyContent: mine ? "flex-end" : "flex-start",
                  marginBottom: 10,
                }}
              >
                <div style={{ maxWidth: "85%", display: "flex", flexDirection: "column", gap: 4 }}>
                  {!mine && msg.author && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#78716c" }}>
                      {msg.author.firstName} {msg.author.lastName}
                    </span>
                  )}
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      background: mine ? "#6366f1" : "#f5f4f0",
                      color: mine ? "white" : "#1c1917",
                      fontSize: 14,
                      lineHeight: 1.45,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {msg.bodyText}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <MessageComposer
        conversationId={activeConversation.id}
        disabled={closed}
        onSent={handleMessageSent}
      />
    </ThreadActivePanel>
  );
}
