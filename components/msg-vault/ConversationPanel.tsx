"use client";

import { useEffect, useRef, useState } from "react";
import { ArchiveRestore } from "lucide-react";
import type { MsgConversationDTO, MsgMessageDTO } from "@/types/msg-vault";
import { conversationLabel } from "@/lib/msg-vault/display";
import { MSG_VAULT } from "@/lib/product/communication-copy";
import { resumeVaultConversation, MsgVaultApiError } from "@/lib/msg-vault/api-client";
import { MessageComposer } from "@/components/msg-vault/MessageComposer";
import { ConversationThreadActions } from "@/components/msg-vault/ConversationThreadActions";
import { MessageAttachmentBubble } from "@/components/msg-vault/MessageAttachmentBubble";
import {
  CommunicationCenterEmpty,
  CommunicationCenterEmptyTitle,
  CommunicationComposerWrap,
  CommunicationMessageFeed,
  CommunicationThreadHeader,
  CommunicationThreadTitle,
} from "@/components/ui/msg-vault";
import { sortMessagesChronological } from "@/components/vault/vault-message-order";

interface Props {
  conversation: MsgConversationDTO | null;
  messages: MsgMessageDTO[];
  currentUserId: string;
  loading?: boolean;
  onMessageSent: (message: MsgMessageDTO) => void;
  onConversationUpdated: (conversation: MsgConversationDTO) => void;
}

export function ConversationPanel({
  conversation,
  messages,
  currentUserId,
  loading,
  onMessageSent,
  onConversationUpdated,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [resumeBusy, setResumeBusy] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, conversation?.id]);

  if (!conversation) {
    return (
      <CommunicationCenterEmpty>
        <CommunicationCenterEmptyTitle>{MSG_VAULT.selectChat}</CommunicationCenterEmptyTitle>
      </CommunicationCenterEmpty>
    );
  }

  const title = conversationLabel(conversation, currentUserId);
  const viewerArchived = conversation.archivedForViewer === true;
  const globalClosed =
    conversation.status === "ARCHIVED" ||
    conversation.status === "LOCKED" ||
    conversation.status === "PENDING_APPROVAL";
  const composerDisabled = globalClosed || viewerArchived;

  const ordered = sortMessagesChronological(messages);

  async function handleResume() {
    setResumeBusy(true);
    try {
      const updated = await resumeVaultConversation(conversation!.id);
      onConversationUpdated(updated);
    } catch (err) {
      console.error(err instanceof MsgVaultApiError ? err.message : err);
    } finally {
      setResumeBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CommunicationThreadHeader>
        <div className="flex min-w-0 items-start justify-between gap-2">
          <CommunicationThreadTitle>{title}</CommunicationThreadTitle>
          <ConversationThreadActions
            conversation={conversation}
            onUpdated={onConversationUpdated}
          />
        </div>
        {globalClosed ? (
          <p className="m-0 mt-1 text-[11px] font-medium text-amber-800">
            This chat is {conversation.status.toLowerCase().replace("_", " ")}.
          </p>
        ) : viewerArchived ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="m-0 text-[11px] text-stone-500">Archived — hidden from your active list.</p>
            <button
              type="button"
              disabled={resumeBusy}
              onClick={() => void handleResume()}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
            >
              <ArchiveRestore className="h-3 w-3" />
              {resumeBusy ? "Resuming…" : MSG_VAULT.resumeChat}
            </button>
          </div>
        ) : null}
      </CommunicationThreadHeader>

      <CommunicationMessageFeed>
        {loading ? (
          <p className="py-4 text-center text-[12px] text-stone-400">Loading messages…</p>
        ) : ordered.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-stone-500">
            No messages yet. Say hello.
          </p>
        ) : (
          ordered.map((msg) => {
            const mine = msg.authorId === currentUserId;
            const attachments = msg.attachments ?? [];
            return (
              <div
                key={msg.id}
                className={`mb-2 flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex max-w-[85%] flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
                  {!mine && msg.author ? (
                    <span className="px-1 text-[10px] font-semibold text-stone-500">
                      {msg.author.firstName} {msg.author.lastName}
                    </span>
                  ) : null}
                  {attachments.map((att) => (
                    <MessageAttachmentBubble key={`${msg.id}-${att.url}`} attachment={att} mine={mine} />
                  ))}
                  {msg.bodyText ? (
                    <div
                      className={`px-3 py-2 text-[14px] leading-snug break-words whitespace-pre-wrap ${
                        mine
                          ? "rounded-2xl rounded-br-md bg-indigo-600 text-white"
                          : "rounded-2xl rounded-bl-md bg-white text-stone-900 shadow-sm ring-1 ring-stone-200/80"
                      }`}
                    >
                      {msg.bodyText}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </CommunicationMessageFeed>

      <CommunicationComposerWrap>
        <MessageComposer
          conversationId={conversation.id}
          disabled={composerDisabled}
          onSent={onMessageSent}
        />
        <p className="m-0 px-2 pb-1 text-[10px] text-stone-400">{MSG_VAULT.attachHint}</p>
      </CommunicationComposerWrap>
    </div>
  );
}
