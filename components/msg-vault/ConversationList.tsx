"use client";

import { Lock } from "lucide-react";
import type { MsgConversationDTO } from "@/types/msg-vault";
import { MsgConversationKind } from "@/types/msg-vault";
import { conversationLabel, formatRelativeTime } from "@/lib/msg-vault/display";

interface Props {
  conversations: MsgConversationDTO[];
  currentUserId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  kindFilter?: "direct" | "thread" | "all";
  loading?: boolean;
  emptyMessage?: string;
}

export function ConversationList({
  conversations,
  currentUserId,
  selectedId,
  onSelect,
  kindFilter = "all",
  loading = false,
  emptyMessage,
}: Props) {
  const filtered = conversations.filter((c) => {
    if (kindFilter === "direct") return c.kind === MsgConversationKind.DIRECT;
    if (kindFilter === "thread") return c.kind !== MsgConversationKind.DIRECT;
    return true;
  });

  if (loading) {
    return (
      <div style={{ padding: 16, fontSize: 13, color: "#a8a29e" }}>
        Loading conversations…
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div
        style={{
          padding:     20,
          fontSize:    13,
          color:       "#78716c",
          lineHeight:  1.55,
          background:  "#fafaf9",
          borderRadius: 12,
          border:      "1px solid #ece9e3",
        }}
      >
        <Lock style={{ width: 18, height: 18, color: "#6366f1", marginBottom: 10 }} />
        <p style={{ margin: 0, fontWeight: 600, color: "#1c1917" }}>No conversations yet</p>
        <p style={{ margin: "8px 0 0" }}>
          {emptyMessage ??
            "Chats and threads appear when you share a trust relationship with someone. There is no open search or stranger messaging."}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {filtered.map((conv) => {
        const active = conv.id === selectedId;
        const label = conversationLabel(conv, currentUserId);
        const when = formatRelativeTime(conv.lastMessageAt ?? conv.updatedAt);
        return (
          <button
            key={conv.id}
            type="button"
            onClick={() => onSelect(conv.id)}
            style={{
              display:       "block",
              width:         "100%",
              textAlign:     "left",
              padding:       "12px 14px",
              borderRadius:  12,
              border:        active ? "1px solid #c7d2fe" : "1px solid transparent",
              background:    active ? "rgba(238,242,255,0.92)" : "transparent",
              cursor:        "pointer",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#1c1917" }}>{label}</span>
              {when && (
                <span style={{ fontSize: 11, color: "#a8a29e", flexShrink: 0 }}>{when}</span>
              )}
            </div>
            <span style={{ fontSize: 11, color: "#78716c", marginTop: 4, display: "block" }}>
              {conv.kind === MsgConversationKind.DIRECT ? "Direct" : "Thread"}
              {conv.status !== "ACTIVE" ? ` · ${conv.status}` : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}
