"use client";

import { useState } from "react";
import { ThreadComposer } from "@/components/vault/ThreadComposer";
import { sendVaultMessage, MsgVaultApiError } from "@/lib/msg-vault/api-client";
import { MSG_VAULT } from "@/lib/product/communication-copy";
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

  async function handleSubmit() {
    const text = body.trim();
    if (!text || sending || disabled) return;

    setSending(true);
    setError("");
    try {
      const message = await sendVaultMessage(conversationId, text);
      setBody("");
      onSent(message);
    } catch (err) {
      setError(err instanceof MsgVaultApiError ? err.message : MSG_VAULT.composerSendError);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ borderTop: "1px solid #ece9e3", background: "#fff" }}>
      <ThreadComposer
        value={body}
        onChange={setBody}
        onSubmit={handleSubmit}
        placeholder={disabled ? MSG_VAULT.composerClosed : MSG_VAULT.composerPlaceholder}
        submitting={sending}
        disabled={disabled}
        error={error}
        tint={{ bg: "#fafaf9", border: "#ece9e3" }}
      />
    </div>
  );
}
