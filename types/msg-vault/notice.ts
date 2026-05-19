// Msg Vault — notice contracts (Agent 49). No Prisma imports.

export const MsgNoticeKind = {
  APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
  INVITE_ACCEPTED:   "INVITE_ACCEPTED",
  MEMBER_JOINED:     "MEMBER_JOINED",
  MEMBER_LEFT:       "MEMBER_LEFT",
  POLICY_CHANGED:    "POLICY_CHANGED",
  MESSAGE_BLOCKED:   "MESSAGE_BLOCKED",
  POST_APPROVED:     "POST_APPROVED",
  POST_DENIED:       "POST_DENIED",
} as const;
export type MsgNoticeKind = (typeof MsgNoticeKind)[keyof typeof MsgNoticeKind];

export const MsgNoticeStatus = {
  UNREAD:   "UNREAD",
  READ:     "READ",
  ARCHIVED: "ARCHIVED",
} as const;
export type MsgNoticeStatus = (typeof MsgNoticeStatus)[keyof typeof MsgNoticeStatus];

export interface MsgNoticeDTO {
  id: string;
  userId: string;
  conversationId: string | null;
  trustUnitId: string | null;
  approvalRequestId: string | null;
  kind: MsgNoticeKind;
  title: string;
  body: string;
  status: MsgNoticeStatus;
  createdAt: string;
  readAt: string | null;
}

export interface CreateNoticeInput {
  userId: string;
  kind: MsgNoticeKind;
  title: string;
  body: string;
  conversationId?: string;
  trustUnitId?: string;
  approvalRequestId?: string;
}
