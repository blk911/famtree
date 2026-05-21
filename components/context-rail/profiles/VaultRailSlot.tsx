"use client";

import type { ReactNode } from "react";

/**
 * Msg Vault foundation — hosts existing selector + MsgContextRail inside shared rail chrome.
 * Does not replace vault selection model (Agent 78 scope).
 */
export function VaultRailSlot({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2.5">{children}</div>;
}
