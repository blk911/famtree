/** Msg Vault list filter — conversations (chats), group threads, governance notices. */
export type MsgVaultTabId = "chats" | "threads" | "notices";

/** Legacy `?tab=overview` URLs map to chats (Agent 107). */
export function normalizeMsgVaultTab(raw: string | null | undefined): MsgVaultTabId {
  if (raw === "threads" || raw === "notices") return raw;
  return "chats";
}
