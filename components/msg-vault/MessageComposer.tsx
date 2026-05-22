"use client";

import { useRef, useState } from "react";
import { Image as ImageIcon, Paperclip, X } from "lucide-react";
import { ThreadComposer } from "@/components/vault/ThreadComposer";
import {
  sendVaultMessage,
  sendVaultMessageWithFile,
  MsgVaultApiError,
} from "@/lib/msg-vault/api-client";
import { MSG_VAULT_ATTACHMENT_ACCEPT } from "@/lib/msg-vault/attachments";
import { MSG_VAULT } from "@/lib/product/communication-copy";
import type { MsgMessageDTO } from "@/types/msg-vault";

interface Props {
  conversationId: string;
  disabled?: boolean;
  onSent: (message: MsgMessageDTO) => void;
}

export function MessageComposer({ conversationId, disabled, onSent }: Props) {
  const [body, setBody] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function pickFile(file: File | undefined) {
    if (!file) return;
    setPendingFile(file);
    setError("");
  }

  async function handleSubmit() {
    const text = body.trim();
    if ((!text && !pendingFile) || sending || disabled) return;

    setSending(true);
    setError("");
    try {
      const message = pendingFile
        ? await sendVaultMessageWithFile(conversationId, pendingFile, text || undefined)
        : await sendVaultMessage(conversationId, text);
      setBody("");
      setPendingFile(null);
      onSent(message);
    } catch (err) {
      setError(err instanceof MsgVaultApiError ? err.message : MSG_VAULT.composerSendError);
    } finally {
      setSending(false);
    }
  }

  const canSend = Boolean(body.trim() || pendingFile) && !disabled && !sending;

  return (
    <div style={{ borderTop: "1px solid #ece9e3", background: "#fff" }}>
      {pendingFile ? (
        <div className="flex items-center justify-between gap-2 border-b border-stone-100 px-3 py-2 text-[12px] text-stone-600">
          <span className="truncate">
            {sending ? "Uploading…" : pendingFile.name}
          </span>
          <button
            type="button"
            aria-label="Remove attachment"
            disabled={sending}
            onClick={() => setPendingFile(null)}
            className="flex shrink-0 cursor-pointer items-center border-0 bg-transparent p-0 text-stone-500 hover:text-stone-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        style={{ position: "absolute", left: -9999, opacity: 0 }}
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          pickFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={MSG_VAULT_ATTACHMENT_ACCEPT}
        style={{ position: "absolute", left: -9999, opacity: 0 }}
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          pickFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <ThreadComposer
        value={body}
        onChange={setBody}
        onSubmit={handleSubmit}
        placeholder={disabled ? MSG_VAULT.composerClosed : MSG_VAULT.composerPlaceholder}
        submitting={sending}
        disabled={disabled}
        error={error}
        tint={{ bg: "#fafaf9", border: "#ece9e3" }}
        footer={
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Attach image"
              disabled={disabled || sending}
              onClick={() => imageInputRef.current?.click()}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-stone-100 text-stone-600 hover:bg-stone-200 disabled:opacity-40"
            >
              <ImageIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Attach file"
              disabled={disabled || sending}
              onClick={() => fileInputRef.current?.click()}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-stone-100 text-stone-600 hover:bg-stone-200 disabled:opacity-40"
            >
              <Paperclip className="h-4 w-4" />
            </button>
          </div>
        }
        canSend={canSend}
      />
    </div>
  );
}
