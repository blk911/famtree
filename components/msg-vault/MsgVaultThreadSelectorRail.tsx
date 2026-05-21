"use client";

import { MessageCirclePlus } from "lucide-react";
import { ThreadSelectorList } from "@/components/vault/ThreadSelectorList";
import { ThreadSelectorRow } from "@/components/vault/ThreadSelectorRow";
import { EmptyThreadState } from "@/components/vault/EmptyThreadState";
import { conversationUnreadCount } from "@/components/vault/conversation-unread";
import { conversationLabel } from "@/lib/msg-vault/display";
import type { MsgConversationDTO } from "@/types/msg-vault";
import { MsgConversationKind } from "@/types/msg-vault";

interface Props {
  conversations: MsgConversationDTO[];
  currentUserId: string;
  selectedId: string | null;
  kindFilter: "direct" | "thread";
  loading?: boolean;
  onSelect: (id: string) => void;
  onStartChat?: () => void;
}

export function MsgVaultThreadSelectorRail({
  conversations,
  currentUserId,
  selectedId,
  kindFilter,
  loading = false,
  onSelect,
  onStartChat,
}: Props) {
  const filtered = conversations.filter((c) =>
    kindFilter === "direct"
      ? c.kind === MsgConversationKind.DIRECT
      : c.kind !== MsgConversationKind.DIRECT,
  );

  const title = kindFilter === "direct" ? "People" : "Trust threads";

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        border: "1px solid #ece9e3",
        padding: "12px 10px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          margin: "0 6px 10px",
        }}
      >
        <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
          {title}
        </p>
        {kindFilter === "direct" && onStartChat ? (
          <button
            type="button"
            onClick={onStartChat}
            title="Start a governed chat"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 700,
              color: "#6366f1",
              background: "#eef2ff",
              border: "1px solid #c7d2fe",
              borderRadius: 8,
              padding: "4px 8px",
              cursor: "pointer",
            }}
          >
            <MessageCirclePlus style={{ width: 12, height: 12 }} />
            New
          </button>
        ) : null}
      </div>

      {loading ? (
        <p style={{ fontSize: 12, color: "#a8a29e", padding: "8px 10px", margin: 0 }}>
          Loading…
        </p>
      ) : filtered.length === 0 ? (
        <EmptyThreadState variant={kindFilter === "direct" ? "no-chats" : "no-threads"} />
      ) : (
        <ThreadSelectorList>
          {filtered.map((conv) => {
            const label = conversationLabel(conv, currentUserId);
            const other = conv.participants?.find((p) => p.userId !== currentUserId);
            const user = other?.user;
            const firstName = user?.firstName ?? label.split(" ")[0] ?? "?";
            const lastName = user?.lastName ?? label.split(" ").slice(1).join(" ") ?? "";
            return (
              <ThreadSelectorRow
                key={conv.id}
                label={label}
                firstName={firstName}
                lastName={lastName}
                photoUrl={user?.photoUrl ?? null}
                active={conv.id === selectedId}
                unread={conversationUnreadCount(conv, currentUserId)}
                onClick={() => onSelect(conv.id)}
                title={`Open ${label}`}
              />
            );
          })}
        </ThreadSelectorList>
      )}
    </div>
  );
}
