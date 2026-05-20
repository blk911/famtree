/**
 * Verifies Msg Vault display guard rules for empty direct chats (Agent 87).
 * Run: npx tsx scripts/msg-vault/verify-conversation-display-guard.ts
 */

import { classifyStaleConversation } from "@/lib/msg-vault/conversation-display-guard";
import { MsgConversationKind } from "@/types/msg-vault";
import type { MsgConversationDTO } from "@/types/msg-vault";

function assert(label: string, condition: boolean) {
  if (!condition) {
    console.error(`FAIL: ${label}`);
    process.exit(1);
  }
  console.log(`ok: ${label}`);
}

const me = "user-a";
const peer = "user-b";

const emptyDirect: MsgConversationDTO = {
  id: "conv-1",
  kind: MsgConversationKind.DIRECT,
  title: null,
  createdById: me,
  trustUnitId: null,
  directKey: `${me}:${peer}`,
  visibilityScope: "PRIVATE",
  status: "ACTIVE",
  lastMessageAt: null,
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  participants: [
    {
      id: "p1",
      conversationId: "conv-1",
      userId: me,
      status: "ACTIVE",
      role: "PARTICIPANT",
      joinedAt: new Date().toISOString(),
      lastReadAt: null,
      mutedAt: null,
    },
    {
      id: "p2",
      conversationId: "conv-1",
      userId: peer,
      status: "ACTIVE",
      role: "PARTICIPANT",
      joinedAt: new Date().toISOString(),
      lastReadAt: null,
      mutedAt: null,
    },
  ],
};

assert(
  "empty direct chat is not stale",
  classifyStaleConversation(emptyDirect, me) === null,
);

const emptyThread: MsgConversationDTO = {
  ...emptyDirect,
  id: "conv-2",
  kind: MsgConversationKind.THREAD,
  trustUnitId: "tu-1",
};

assert(
  "empty thread is still stale (no_messages)",
  classifyStaleConversation(emptyThread, me) === "no_messages",
);

console.log("\nAll display-guard checks passed.");
