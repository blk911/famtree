"use client";

import { MessageCircle } from "lucide-react";
import { MemberAvatar } from "@/components/vault/MemberAvatar";
import { ThreadStatusDot } from "@/components/vault/ThreadStatusDot";

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
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`thread-selector-row${active ? " thread-selector-row--active" : ""}`}
    >
      <MemberAvatar firstName={firstName} lastName={lastName} photoUrl={photoUrl} />
      <span className="thread-selector-row__label">{label}</span>
      {!disabled && showChatIcon && (
        <span className="thread-selector-row__actions">
          <MessageCircle
            aria-hidden
            style={{ width: 13, height: 13, color: "#818cf8", opacity: 0.9, flexShrink: 0 }}
          />
          <ThreadStatusDot unread={unread} />
        </span>
      )}
    </button>
  );
}
