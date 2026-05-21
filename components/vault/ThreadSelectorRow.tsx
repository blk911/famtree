"use client";

import { MessageCircle } from "lucide-react";
import { MemberAvatar } from "@/components/vault/MemberAvatar";
import { ThreadStatusDot } from "@/components/vault/ThreadStatusDot";
import {
  ThreadSelectorRow as UiThreadSelectorRow,
  ThreadSelectorRowActions,
  ThreadSelectorRowLabel,
} from "@/components/ui/thread";

export function ThreadSelectorRow({
  label,
  firstName,
  lastName,
  photoUrl,
  active,
  disabled,
  unread = 0,
  onClick,
  title,
  showChatIcon = true,
  compact,
}: {
  label: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  active: boolean;
  disabled?: boolean;
  unread?: number;
  onClick: () => void;
  title: string;
  showChatIcon?: boolean;
  compact?: boolean;
}) {
  return (
    <UiThreadSelectorRow
      disabled={disabled}
      onClick={onClick}
      title={title}
      active={active}
      compact={compact}
    >
      <MemberAvatar firstName={firstName} lastName={lastName} photoUrl={photoUrl} />
      <ThreadSelectorRowLabel>{label}</ThreadSelectorRowLabel>
      {!disabled && showChatIcon && (
        <ThreadSelectorRowActions>
          <MessageCircle
            aria-hidden
            className="h-3.5 w-3.5 shrink-0 text-indigo-400 opacity-90"
          />
          <ThreadStatusDot unread={unread} />
        </ThreadSelectorRowActions>
      )}
    </UiThreadSelectorRow>
  );
}
