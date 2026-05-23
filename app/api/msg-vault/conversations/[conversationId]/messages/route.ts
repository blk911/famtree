// GET  /api/msg-vault/conversations/[conversationId]/messages
// POST /api/msg-vault/conversations/[conversationId]/messages

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { readJson, parsePagination } from "@/lib/aihsafe/api/parse";
import { created, ok, unauthenticated, validationFail } from "@/lib/aihsafe/api/envelopes";
import { handleMsgVaultError } from "@/lib/msg-vault/route-utils";
import {
  listMessages,
  sendMessage,
  sendMessageWithFile,
  recordBlockedMessageAttempt,
} from "@/lib/msg-vault/messages";
import { MsgVaultError } from "@/lib/msg-vault/errors";

type RouteCtx = { params: Promise<{ conversationId: string }> };

const SendMessageSchema = z.object({
  bodyText: z.string().min(1).max(5000),
});

export async function GET(req: NextRequest, routeCtx: RouteCtx) {
  try {
    const user = await requireAuth();
    const { conversationId } = await routeCtx.params;
    if (!conversationId?.trim()) {
      return validationFail("Conversation id is required.");
    }

    const { cursor, limit } = parsePagination(req);
    const result = await listMessages(conversationId, user.id, { cursor, limit });

    return ok({
      items: result.items,
      pagination: {
        cursor:  result.cursor,
        hasMore: result.hasMore,
        total:   null,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return unauthenticated();
    }
    return handleMsgVaultError(err);
  }
}

export async function POST(req: NextRequest, routeCtx: RouteCtx) {
  try {
    const user = await requireAuth();
    const { conversationId } = await routeCtx.params;
    if (!conversationId?.trim()) {
      return validationFail("Conversation id is required.");
    }

    const contentType = req.headers.get("content-type") ?? "";
    let message;

    try {
      if (contentType.includes("multipart/form-data")) {
        const form = await req.formData();
        const file = form.get("file");
        const bodyText = String(form.get("bodyText") ?? "").trim();
        if (!(file instanceof File) || file.size === 0) {
          return validationFail("Attachment file is required.");
        }
        message = await sendMessageWithFile(user.id, conversationId, file, bodyText || undefined);
      } else {
        const body = await readJson(req);
        const parsed = SendMessageSchema.safeParse(body);
        if (!parsed.success) {
          return validationFail("Message body is required (max 5000 characters).");
        }
        message = await sendMessage(user.id, conversationId, {
          bodyText: parsed.data.bodyText,
        });
      }
      return created({ message });
    } catch (sendErr) {
      if (
        sendErr instanceof MsgVaultError &&
        sendErr.status === 422 &&
        conversationId
      ) {
        await recordBlockedMessageAttempt(user.id, conversationId, sendErr.message).catch(
          () => null,
        );
      }
      throw sendErr;
    }
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return unauthenticated();
    }
    return handleMsgVaultError(err);
  }
}
