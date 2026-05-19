// Client-side fetch helpers for /api/msg-vault (Agent 51).

import type {
  GovernanceOverlayDTO,
  MsgConversationDTO,
  MsgMessageDTO,
  MsgNoticeDTO,
  MsgParticipantDTO,
  RelationshipContextDTO,
  TrustUnitContextDTO,
} from "@/types/msg-vault";

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { message?: string; code?: string };
};

export class MsgVaultApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MsgVaultApiError";
  }
}

async function parseEnvelope<T>(res: Response): Promise<T> {
  const json = (await res.json()) as Envelope<T>;
  if (!json.ok || json.data === undefined) {
    throw new MsgVaultApiError(json.error?.message ?? "Something went wrong. Please try again.");
  }
  return json.data;
}

export interface AllowedChatContact {
  userId: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  reasons: string[];
  existingConversationId: string | null;
}

export async function fetchConversations(): Promise<MsgConversationDTO[]> {
  const data = await parseEnvelope<{ items: MsgConversationDTO[] }>(
    await fetch("/api/msg-vault/conversations", { cache: "no-store" }),
  );
  return data.items;
}

export async function fetchAllowedChatContacts(): Promise<AllowedChatContact[]> {
  const data = await parseEnvelope<{ contacts: AllowedChatContact[] }>(
    await fetch("/api/msg-vault/conversations?allowedContacts=1", { cache: "no-store" }),
  );
  return data.contacts;
}

export async function startDirectConversation(
  targetUserId: string,
): Promise<MsgConversationDTO> {
  const data = await parseEnvelope<{ conversation: MsgConversationDTO }>(
    await fetch("/api/msg-vault/conversations", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ type: "direct", targetUserId }),
    }),
  );
  return data.conversation;
}

export async function startThreadConversation(input: {
  trustUnitId: string;
  participantUserIds?: string[];
  title?: string;
}): Promise<MsgConversationDTO> {
  const data = await parseEnvelope<{ conversation: MsgConversationDTO }>(
    await fetch("/api/msg-vault/conversations", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        type:               "thread",
        trustUnitId:        input.trustUnitId,
        participantUserIds: input.participantUserIds ?? [],
        title:              input.title,
      }),
    }),
  );
  return data.conversation;
}

export async function fetchConversationDetail(conversationId: string): Promise<{
  conversation: MsgConversationDTO;
  participants: MsgParticipantDTO[];
  governanceOverlay: GovernanceOverlayDTO;
  relationshipContext: RelationshipContextDTO;
  trustUnit: TrustUnitContextDTO | null;
  privateThreadsEnabled: boolean;
}> {
  return parseEnvelope(
    await fetch(`/api/msg-vault/conversations/${conversationId}`, { cache: "no-store" }),
  );
}

export async function fetchMessages(
  conversationId: string,
  cursor?: string,
  options?: { limit?: number },
): Promise<{ items: MsgMessageDTO[]; pagination: { cursor: string | null; hasMore: boolean } }> {
  const qs = new URLSearchParams();
  if (cursor) qs.set("cursor", cursor);
  if (options?.limit != null) qs.set("limit", String(options.limit));
  const suffix = qs.toString() ? `?${qs}` : "";
  return parseEnvelope(
    await fetch(`/api/msg-vault/conversations/${conversationId}/messages${suffix}`, {
      cache: "no-store",
    }),
  );
}

export async function sendVaultMessage(
  conversationId: string,
  bodyText: string,
): Promise<MsgMessageDTO> {
  const data = await parseEnvelope<{ message: MsgMessageDTO }>(
    await fetch(`/api/msg-vault/conversations/${conversationId}/messages`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ bodyText }),
    }),
  );
  return data.message;
}

export interface VaultNoticeItem extends MsgNoticeDTO {
  source: "persisted" | "approval" | "invite" | "audit";
  sourceId: string;
  href: string | null;
  contextLines: string[];
}

export async function fetchNotices(
  status?: string,
): Promise<{ items: VaultNoticeItem[]; unreadCount: number }> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const data = await parseEnvelope<{ items: VaultNoticeItem[]; unreadCount: number }>(
    await fetch(`/api/msg-vault/notices${qs}`, { cache: "no-store" }),
  );
  return { items: data.items, unreadCount: data.unreadCount };
}

export async function markVaultNoticeRead(noticeId: string): Promise<MsgNoticeDTO> {
  const data = await parseEnvelope<{ notice: MsgNoticeDTO }>(
    await fetch(`/api/msg-vault/notices/${noticeId}/read`, { method: "POST" }),
  );
  return data.notice;
}
