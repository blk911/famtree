"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchConversations,
  startDirectConversation,
  startThreadConversation,
  MsgVaultApiError,
} from "@/lib/msg-vault/api-client";
import type { MsgConversationDTO, MsgMessageDTO } from "@/types/msg-vault";
import { MsgConversationKind } from "@/types/msg-vault";
import { makeDirectConversationKey } from "@/lib/msg-vault/directKey";
import { conversationUnreadCount } from "@/components/vault/conversation-unread";

type TrustUnitRow = {
  id: string;
  members: Array<{
    user: { id: string; firstName: string; lastName: string; photoUrl: string | null };
  }>;
};

type Ctx = {
  conversations: MsgConversationDTO[];
  directConversations: MsgConversationDTO[];
  threadConversations: MsgConversationDTO[];
  loading: boolean;
  error: string | null;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  selectConversation: (id: string) => void;
  openDirectPeer: (peerUserId: string) => Promise<void>;
  openTrustUnit: (unit: TrustUnitRow) => Promise<void>;
  refreshConversations: () => Promise<void>;
  recordMessageSent: (message: MsgMessageDTO) => void;
  isDirectPeerActive: (peerUserId: string) => boolean;
  isTrustUnitActive: (trustUnitId: string) => boolean;
  unreadForConversation: (conv: MsgConversationDTO) => number;
};

const DashboardPrivateThreadsContext = createContext<Ctx | null>(null);

export function useDashboardPrivateThreads(): Ctx {
  const ctx = useContext(DashboardPrivateThreadsContext);
  if (!ctx) {
    throw new Error("useDashboardPrivateThreads must be used within DashboardPrivateThreadsProvider");
  }
  return ctx;
}

export function DashboardPrivateThreadsProvider({
  children,
  currentUserId,
  trustUnits,
  onPrivateTabSelect,
}: {
  children: ReactNode;
  currentUserId: string;
  trustUnits: TrustUnitRow[];
  onPrivateTabSelect?: () => void;
}) {
  const [conversations, setConversations] = useState<MsgConversationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const refreshConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await fetchConversations();
      setConversations(items);
    } catch (err) {
      setError(
        err instanceof MsgVaultApiError ? err.message : "Could not load conversations.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  const mergeConversation = useCallback((conv: MsgConversationDTO) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === conv.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = conv;
        return next;
      }
      return [conv, ...prev];
    });
  }, []);

  const selectConversation = useCallback(
    (id: string) => {
      setError(null);
      setActiveConversationId(id);
      onPrivateTabSelect?.();
    },
    [onPrivateTabSelect],
  );

  const findDirectWithPeer = useCallback(
    (peerUserId: string) => {
      const key = makeDirectConversationKey(currentUserId, peerUserId);
      return (
        conversations.find(
          (c) => c.kind === MsgConversationKind.DIRECT && c.directKey === key,
        ) ??
        conversations.find(
          (c) =>
            c.kind === MsgConversationKind.DIRECT &&
            c.participants?.some((p) => p.userId === peerUserId),
        )
      );
    },
    [conversations, currentUserId],
  );

  const findThreadForUnit = useCallback(
    (trustUnitId: string) =>
      conversations.find(
        (c) =>
          c.trustUnitId === trustUnitId &&
          (c.kind === MsgConversationKind.THREAD ||
            c.kind === MsgConversationKind.SPACE_THREAD),
      ),
    [conversations],
  );

  const openDirectPeer = useCallback(
    async (peerUserId: string) => {
      if (peerUserId === currentUserId) return;
      const existing = findDirectWithPeer(peerUserId);
      if (existing) {
        selectConversation(existing.id);
        return;
      }
      try {
        setError(null);
        const conv = await startDirectConversation(peerUserId);
        mergeConversation(conv);
        selectConversation(conv.id);
      } catch (err) {
        setError(
          err instanceof MsgVaultApiError ? err.message : "Could not open conversation.",
        );
      }
    },
    [currentUserId, findDirectWithPeer, mergeConversation, selectConversation],
  );

  const openTrustUnit = useCallback(
    async (unit: TrustUnitRow) => {
      const existing = findThreadForUnit(unit.id);
      if (existing) {
        selectConversation(existing.id);
        return;
      }
      const other = unit.members.map((m) => m.user).find((u) => u.id !== currentUserId);
      if (!other) {
        setError("Add another member to this trust unit to start a thread.");
        return;
      }
      try {
        setError(null);
        const conv = await startThreadConversation({
          trustUnitId: unit.id,
          participantUserIds: [other.id],
          title: unit.members.map((m) => m.user.firstName).join(" · "),
        });
        mergeConversation(conv);
        selectConversation(conv.id);
      } catch (err) {
        setError(
          err instanceof MsgVaultApiError ? err.message : "Could not open trust thread.",
        );
      }
    },
    [currentUserId, findThreadForUnit, mergeConversation, selectConversation],
  );

  const directConversations = useMemo(
    () => conversations.filter((c) => c.kind === MsgConversationKind.DIRECT),
    [conversations],
  );

  const threadConversations = useMemo(
    () => conversations.filter((c) => c.kind !== MsgConversationKind.DIRECT),
    [conversations],
  );

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  const isDirectPeerActive = useCallback(
    (peerUserId: string) => {
      if (!activeConversation || activeConversation.kind !== MsgConversationKind.DIRECT) {
        return false;
      }
      return activeConversation.participants?.some((p) => p.userId === peerUserId) ?? false;
    },
    [activeConversation],
  );

  const isTrustUnitActive = useCallback(
    (trustUnitId: string) => activeConversation?.trustUnitId === trustUnitId,
    [activeConversation],
  );

  const unreadForConversation = useCallback(
    (conv: MsgConversationDTO) => conversationUnreadCount(conv, currentUserId),
    [currentUserId],
  );

  const recordMessageSent = useCallback((message: MsgMessageDTO) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === message.conversationId
          ? {
              ...c,
              lastMessageAt: message.createdAt,
              updatedAt: message.updatedAt,
            }
          : c,
      ),
    );
  }, []);

  const value = useMemo(
    (): Ctx => ({
      conversations,
      directConversations,
      threadConversations,
      loading,
      error,
      activeConversationId,
      setActiveConversationId,
      selectConversation,
      openDirectPeer,
      openTrustUnit,
      refreshConversations,
      recordMessageSent,
      isDirectPeerActive,
      isTrustUnitActive,
      unreadForConversation,
    }),
    [
      conversations,
      directConversations,
      threadConversations,
      loading,
      error,
      activeConversationId,
      selectConversation,
      openDirectPeer,
      openTrustUnit,
      refreshConversations,
      recordMessageSent,
      isDirectPeerActive,
      isTrustUnitActive,
      unreadForConversation,
    ],
  );

  return (
    <DashboardPrivateThreadsContext.Provider value={value}>
      {children}
    </DashboardPrivateThreadsContext.Provider>
  );
}
