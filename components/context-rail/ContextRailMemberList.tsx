"use client";

import Link from "next/link";
import { ThreadSelectorRow } from "@/components/vault/ThreadSelectorRow";
import { ThreadSelectorList } from "@/components/vault/ThreadSelectorList";
import type { ContextRailMember } from "./types";
import { ContextRailEmptyState } from "./ContextRailEmptyState";

export function ContextRailMemberList({
  members,
  currentUserId,
  emptyMessage = "No members to show yet.",
  onMemberClick,
  activeMemberId,
  showChatIcon = true,
}: {
  members: ContextRailMember[];
  currentUserId: string;
  emptyMessage?: string;
  onMemberClick?: (memberId: string) => void;
  activeMemberId?: string | null;
  showChatIcon?: boolean;
}) {
  if (members.length === 0) {
    return <ContextRailEmptyState message={emptyMessage} />;
  }

  return (
    <ThreadSelectorList>
      {members.map((m) => {
        const isSelf = m.id === currentUserId;
        const label =
          m.badge && !isSelf
            ? `${m.firstName} ${m.lastName} · ${m.badge}`
            : `${m.firstName} ${m.lastName}`;
        const row = (
          <ThreadSelectorRow
            key={m.id}
            label={label}
            firstName={m.firstName}
            lastName={m.lastName}
            photoUrl={m.photoUrl}
            active={activeMemberId === m.id}
            disabled={isSelf}
            unread={0}
            showChatIcon={showChatIcon && !!onMemberClick && !isSelf}
            onClick={() => onMemberClick?.(m.id)}
            title={isSelf ? "This is you" : `Open ${m.firstName} ${m.lastName}`}
          />
        );
        if (m.href && !onMemberClick) {
          return (
            <Link key={m.id} href={m.href} style={{ textDecoration: "none", color: "inherit" }}>
              {row}
            </Link>
          );
        }
        return row;
      })}
    </ThreadSelectorList>
  );
}
