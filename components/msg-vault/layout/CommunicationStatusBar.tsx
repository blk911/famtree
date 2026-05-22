"use client";

import type { MsgVaultTabId } from "@/components/msg-vault/MsgVaultTabs";
import { CommunicationStatusPill } from "@/components/ui/msg-vault";

export function CommunicationStatusBar({
  active,
  onChange,
  chatCount,
  threadCount,
  noticeCount,
}: {
  active: MsgVaultTabId;
  onChange: (tab: MsgVaultTabId) => void;
  chatCount: number;
  threadCount: number;
  noticeCount: number;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="tablist"
      aria-label="Msg Vault filters"
    >
      <CommunicationStatusPill
        active={active === "chats"}
        onClick={() => onChange("chats")}
      >
        Chats {chatCount}
      </CommunicationStatusPill>
      <CommunicationStatusPill
        active={active === "threads"}
        onClick={() => onChange("threads")}
      >
        Threads {threadCount}
      </CommunicationStatusPill>
      <CommunicationStatusPill
        active={active === "notices"}
        onClick={() => onChange("notices")}
      >
        Notices {noticeCount}
      </CommunicationStatusPill>
    </div>
  );
}
