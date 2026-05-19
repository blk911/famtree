// Msg Vault — message contracts (Agent 49). No Prisma imports.

export const MsgMessageStatus = {
  SENT:              "SENT",
  PENDING_APPROVAL:  "PENDING_APPROVAL",
  REMOVED:           "REMOVED",
  BLOCKED:           "BLOCKED",
} as const;
export type MsgMessageStatus =
  (typeof MsgMessageStatus)[keyof typeof MsgMessageStatus];

export interface MsgMessageDTO {
  id: string;
  conversationId: string;
  authorId: string;
  bodyText: string;
  status: MsgMessageStatus;
  governanceState: string;
  escalationState: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  author?: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
  };
}

export interface SendMessageInput {
  bodyText: string;
}
