"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { sendVaultMessage, MsgVaultApiError } from "@/lib/msg-vault/api-client";
import type { MsgMessageDTO } from "@/types/msg-vault";

interface Props {
  conversationId: string;
  disabled?: boolean;
  onSent: (message: MsgMessageDTO) => void;
}

export function MessageComposer({ conversationId, disabled, onSent }: Props) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || sending || disabled) return;

    setSending(true);
    setError("");
    try {
      const message = await sendVaultMessage(conversationId, text);
      setBody("");
      onSent(message);
    } catch (err) {
      setError(err instanceof MsgVaultApiError ? err.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        borderTop:  "1px solid #ece9e3",
        padding:    "14px 16px",
        background: "#fff",
      }}
    >
      {error && (
        <p style={{ margin: "0 0 8px", fontSize: 12, color: "#b91c1c", fontWeight: 500 }}>{error}</p>
      )}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={disabled ? "This conversation is closed." : "Write a governed message…"}
          disabled={disabled || sending}
          rows={2}
          maxLength={5000}
          style={{
            flex:         1,
            resize:       "vertical",
            minHeight:    44,
            maxHeight:    120,
            padding:      "10px 12px",
            borderRadius: 12,
            border:       "1px solid #e7e5e4",
            fontSize:     14,
            lineHeight:   1.45,
            fontFamily:   "inherit",
          }}
        />
        <button
          type="submit"
          disabled={disabled || sending || !body.trim()}
          aria-label="Send message"
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            width:          44,
            height:         44,
            borderRadius:   12,
            border:         "none",
            background:     disabled || !body.trim() ? "#e7e5e4" : "#6366f1",
            color:          "white",
            cursor:         disabled || !body.trim() ? "default" : "pointer",
            flexShrink:     0,
          }}
        >
          <Send style={{ width: 18, height: 18 }} />
        </button>
      </div>
    </form>
  );
}
