"use client";

import { useEffect, useRef } from "react";
import type { MsgConversationDTO, MsgMessageDTO } from "@/types/msg-vault";
import { conversationLabel } from "@/lib/msg-vault/display";
import { MSG_VAULT } from "@/lib/product/communication-copy";
import { MessageComposer } from "@/components/msg-vault/MessageComposer";
import {
  CommunicationAttachHint,
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
      <CommunicationCenterEmpty>
        <CommunicationCenterEmptyTitle>{MSG_VAULT.selectChat}</CommunicationCenterEmptyTitle>
      </CommunicationCenterEmpty>
    );
  }

  const title = conversationLabel(conversation, currentUserId);
  const closed =
    conversation.status === "ARCHIVED" ||
    conversation.status === "LOCKED" ||
    conversation.status === "PENDING_APPROVAL";

  const ordered = sortMessagesChronological(messages);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CommunicationThreadHeader>
        <CommunicationThreadTitle>{title}</CommunicationThreadTitle>
        {closed ? (
          <p className="m-0 mt-1 text-[11px] font-medium text-amber-800">
            This chat is {conversation.status.toLowerCase().replace("_", " ")}.
          </p>
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
            return (
              <div
                key={msg.id}
                className={`mb-2 flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex max-w-[85%] flex-col gap-0.5 ${mine ? "items-end" : "items-start"}`}>
                  {!mine && msg.author ? (
                    <span className="px-1 text-[10px] font-semibold text-stone-500">
                      {msg.author.firstName} {msg.author.lastName}
                    </span>
                  ) : null}
                  <div
                    className={`px-3 py-2 text-[14px] leading-snug break-words whitespace-pre-wrap ${
                      mine
                        ? "rounded-2xl rounded-br-md bg-indigo-600 text-white"
                        : "rounded-2xl rounded-bl-md bg-white text-stone-900 shadow-sm ring-1 ring-stone-200/80"
                    }`}
                  >
                    {msg.bodyText}
                  </div>
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
          disabled={closed}
          onSent={onMessageSent}
        />
        <CommunicationAttachHint>{MSG_VAULT.attachHint}</CommunicationAttachHint>
      </CommunicationComposerWrap>
    </div>
  );
}
