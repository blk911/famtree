"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, MoreHorizontal } from "lucide-react";
import {
  archiveVaultConversation,
  resumeVaultConversation,
  MsgVaultApiError,
} from "@/lib/msg-vault/api-client";
import type { MsgConversationDTO } from "@/types/msg-vault";

export function ConversationThreadActions({
  conversation,
  onUpdated,
}: {
  conversation: MsgConversationDTO;
  onUpdated: (conv: MsgConversationDTO) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const archived = conversation.archivedForViewer === true;
  const globalClosed =
    conversation.status === "LOCKED" || conversation.status === "PENDING_APPROVAL";

  if (globalClosed) return null;

  async function run(action: "archive" | "resume") {
    setBusy(true);
    setError("");
    try {
      const updated =
        action === "archive"
          ? await archiveVaultConversation(conversation.id)
          : await resumeVaultConversation(conversation.id);
      onUpdated(updated);
      setOpen(false);
    } catch (err) {
      setError(err instanceof MsgVaultApiError ? err.message : "Could not update chat.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Chat actions"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-stone-100 text-stone-600 hover:bg-stone-200 disabled:opacity-50"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-10 cursor-default border-0 bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute right-0 top-full z-20 mt-1 min-w-[148px] overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-md"
            role="menu"
          >
            {archived ? (
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                onClick={() => void run("resume")}
                className="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-3 py-2 text-left text-[12px] font-medium text-stone-800 hover:bg-stone-50"
              >
                <ArchiveRestore className="h-3.5 w-3.5" />
                Resume chat
              </button>
            ) : (
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                onClick={() => void run("archive")}
                className="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-3 py-2 text-left text-[12px] font-medium text-stone-800 hover:bg-stone-50"
              >
                <Archive className="h-3.5 w-3.5" />
                Archive chat
              </button>
            )}
          </div>
        </>
      ) : null}
      {error ? <p className="absolute right-0 top-full mt-1 text-[10px] text-red-600">{error}</p> : null}
    </div>
  );
}
