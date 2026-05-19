// Client-side fetch helpers for /api/msg-vault (Agent 51).

import type {
  GovernanceOverlayDTO,
  MsgConversationDTO,
  MsgMessageDTO,
  MsgNoticeDTO,
  MsgParticipantDTO,
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

export async function fetchConversations(): Promise<MsgConversationDTO[]> {
  const data = await parseEnvelope<{ items: MsgConversationDTO[] }>(
    await fetch("/api/msg-vault/conversations", { cache: "no-store" }),
  );
  return data.items;
}

export async function fetchConversationDetail(conversationId: string): Promise<{
  conversation: MsgConversationDTO;
  participants: MsgParticipantDTO[];
  governanceOverlay: GovernanceOverlayDTO;
}> {
  return parseEnvelope(
    await fetch(`/api/msg-vault/conversations/${conversationId}`, { cache: "no-store" }),
  );
}

export async function fetchMessages(
  conversationId: string,
  cursor?: string,
): Promise<{ items: MsgMessageDTO[]; pagination: { cursor: string | null; hasMore: boolean } }> {
  const qs = new URLSearchParams();
  if (cursor) qs.set("cursor", cursor);
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

export async function fetchNotices(status?: string): Promise<MsgNoticeDTO[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const data = await parseEnvelope<{ items: MsgNoticeDTO[] }>(
    await fetch(`/api/msg-vault/notices${qs}`, { cache: "no-store" }),
  );
  return data.items;
}

export async function markVaultNoticeRead(noticeId: string): Promise<MsgNoticeDTO> {
  const data = await parseEnvelope<{ notice: MsgNoticeDTO }>(
    await fetch(`/api/msg-vault/notices/${noticeId}/read`, { method: "POST" }),
  );
  return data.notice;
}
