"use client";

import { MemberAvatar } from "@/components/vault/MemberAvatar";
import { ThreadStatusDot } from "@/components/vault/ThreadStatusDot";
import { CommunicationListRow } from "@/components/ui/msg-vault";

export function ConversationListRow({
  title,
  preview,
  firstName,
  lastName,
  photoUrl,
  active,
  unread = 0,
  onClick,
}: {
  title: string;
  preview: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  active?: boolean;
  unread?: number;
  onClick: () => void;
}) {
  return (
    <CommunicationListRow type="button" active={active} onClick={onClick} title={title}>
      <MemberAvatar firstName={firstName} lastName={lastName} photoUrl={photoUrl} size={36} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-semibold text-stone-900">{title}</span>
          {preview ? (
            <span className="shrink-0 text-[10px] text-stone-400">{preview}</span>
          ) : null}
        </span>
      </span>
      <ThreadStatusDot unread={unread} />
    </CommunicationListRow>
  );
}
