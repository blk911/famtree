"use client";

import { useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";
import type { MsgConversationDTO, MsgMessageDTO } from "@/types/msg-vault";
import { conversationLabel } from "@/lib/msg-vault/display";
import { MessageComposer } from "@/components/msg-vault/MessageComposer";

interface Props {
  conversation: MsgConversationDTO | null;
  messages: MsgMessageDTO[];
  currentUserId: string;
  loading?: boolean;
  onMessageSent: (message: MsgMessageDTO) => void;
}

export function ConversationPanel({
  conversation,
  messages,
  currentUserId,
  loading,
  onMessageSent,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, conversation?.id]);

  if (!conversation) {
    return (
      <div
        style={{
          flex:           1,
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          padding:        32,
          color:          "#78716c",
          textAlign:      "center",
        }}
      >
        <MessageSquare style={{ width: 40, height: 40, color: "#c4b5fd", marginBottom: 14 }} />
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#1c1917" }}>
          Select a conversation
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.5, maxWidth: 280 }}>
          Choose a chat or thread from the list. Messages stay within your family trust
          relationships — never with strangers.
        </p>
      </div>
    );
  }

  const title = conversationLabel(conversation, currentUserId);
  const closed =
    conversation.status === "ARCHIVED" ||
    conversation.status === "LOCKED" ||
    conversation.status === "PENDING_APPROVAL";

  const ordered = [...messages].reverse();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 360 }}>
      <div
        style={{
          padding:      "14px 18px",
          borderBottom: "1px solid #ece9e3",
          background:   "#fff",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1c1917" }}>{title}</h2>
        {closed && (
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#b45309" }}>
            This conversation is {conversation.status.toLowerCase().replace("_", " ")}.
          </p>
        )}
      </div>

      <div
        style={{
          flex:     1,
          overflow: "auto",
          padding:  16,
          background: "#fafaf9",
        }}
      >
        {loading ? (
          <p style={{ padding: 20, fontSize: 13, color: "#a8a29e" }}>Loading messages…</p>
        ) : ordered.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1c1917" }}>
              No messages yet
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "#78716c" }}>
              Send a message to start coordinating in this governed space.
            </p>
          </div>
        ) : (
          ordered.map((msg) => {
            const mine = msg.authorId === currentUserId;
            return (
              <div
                key={msg.id}
                style={{
                  display:        "flex",
                  justifyContent: mine ? "flex-end" : "flex-start",
                  marginBottom:   10,
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
                      padding:      "10px 14px",
                      borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      background:   mine ? "#6366f1" : "#f5f4f0",
                      color:        mine ? "white" : "#1c1917",
                      fontSize:     14,
                      lineHeight:   1.45,
                      whiteSpace:   "pre-wrap",
                      wordBreak:    "break-word",
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
        conversationId={conversation.id}
        disabled={closed}
        onSent={onMessageSent}
      />
    </div>
  );
}
