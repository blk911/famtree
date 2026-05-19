// Msg Vault — conversation contracts (Agent 49). No Prisma imports.

import type { VisibilityScope } from "@/types/aihsafe/visibility";

export const MsgConversationKind = {
  DIRECT:        "DIRECT",
  THREAD:        "THREAD",
  NOTICE_THREAD: "NOTICE_THREAD",
  SPACE_THREAD:  "SPACE_THREAD",
} as const;
export type MsgConversationKind =
  (typeof MsgConversationKind)[keyof typeof MsgConversationKind];

export const MsgConversationStatus = {
  ACTIVE:            "ACTIVE",
  ARCHIVED:          "ARCHIVED",
  LOCKED:            "LOCKED",
  PENDING_APPROVAL:  "PENDING_APPROVAL",
} as const;
export type MsgConversationStatus =
  (typeof MsgConversationStatus)[keyof typeof MsgConversationStatus];

export const MsgParticipantRole = {
  OWNER:       "OWNER",
  PARTICIPANT: "PARTICIPANT",
  OBSERVER:    "OBSERVER",
  GUARDIAN:    "GUARDIAN",
  MODERATOR:   "MODERATOR",
} as const;
export type MsgParticipantRole =
  (typeof MsgParticipantRole)[keyof typeof MsgParticipantRole];

export const MsgParticipantStatus = {
  ACTIVE:  "ACTIVE",
  LEFT:    "LEFT",
  REMOVED: "REMOVED",
  PENDING: "PENDING",
} as const;
export type MsgParticipantStatus =
  (typeof MsgParticipantStatus)[keyof typeof MsgParticipantStatus];

export interface MsgParticipantDTO {
  id: string;
  conversationId: string;
  userId: string;
  role: MsgParticipantRole;
  status: MsgParticipantStatus;
  joinedAt: string;
  lastReadAt: string | null;
  mutedAt: string | null;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
  };
}

export interface MsgConversationDTO {
  id: string;
  kind: MsgConversationKind;
  title: string | null;
  createdById: string;
  trustUnitId: string | null;
  directKey: string | null;
  visibilityScope: VisibilityScope | string;
  status: MsgConversationStatus;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  participants?: MsgParticipantDTO[];
}

/** Input for creating a governed group / trust-unit thread (Agent 50+). */
export interface CreateThreadConversationInput {
  kind?: Extract<MsgConversationKind, "THREAD" | "SPACE_THREAD">;
  title?: string;
  trustUnitId?: string;
  participantUserIds: string[];
  visibilityScope?: VisibilityScope;
}
