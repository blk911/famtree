"use client";

import { MsgVaultNavCount, MsgVaultNavRowButton } from "@/components/ui/msg-vault";

export function MsgVaultNavRow({
  label,
  count,
  onClick,
  active,
  urgent,
}: {
  label: string;
  count?: number;
  onClick: () => void;
  active?: boolean;
  urgent?: boolean;
}) {
  return (
    <MsgVaultNavRowButton active={active} urgent={urgent} onClick={onClick}>
      <span>{label}</span>
      {count !== undefined && <MsgVaultNavCount>{count}</MsgVaultNavCount>}
    </MsgVaultNavRowButton>
  );
}
