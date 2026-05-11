// AIH Safe — Child escalation status
// GET /api/aihsafe/escalations/mine — list this user's own pending approval requests

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";
import { buildContextSummary } from "@/lib/aihsafe";
import {
  ok,
  unauthenticated,
  serverError,
} from "@/lib/aihsafe/api/envelopes";
import { parsePagination } from "@/lib/aihsafe/api/parse";
import type { ApprovalRequestDTO } from "@/types/aihsafe/dto";

const VALID_STATES = ["pending", "approved", "denied", "revoked", "expired"] as const;
type StateFilter = (typeof VALID_STATES)[number];

function toDTO(
  row: {
    id: string;
    requestorId: string;
    approverId: string;
    actionKind: string;
    contextJson: unknown;
    state: string;
    expiresAt: Date;
    resolvedAt: Date | null;
    createdAt: Date;
  }
): ApprovalRequestDTO {
  return {
    id:             row.id,
    requestorId:    row.requestorId,
    requestorName:  "",
    approverId:     row.approverId,
    actionKind:     row.actionKind,
    contextSummary: buildContextSummary(row.actionKind, row.contextJson),
    state:          row.state as ApprovalRequestDTO["state"],
    expiresAt:      row.expiresAt.toISOString(),
    resolvedAt:     row.resolvedAt?.toISOString() ?? null,
    createdAt:      row.createdAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthenticated();
  }

  const { cursor, limit } = parsePagination(req);
  const url = new URL(req.url);
  const rawState = url.searchParams.get("state") ?? "pending";
  const stateFilter: StateFilter = (VALID_STATES as readonly string[]).includes(rawState)
    ? (rawState as StateFilter)
    : "pending";

  try {
    const rows = await prisma.aihApprovalRequest.findMany({
      where: {
        requestorId: user.id,
        state:       stateFilter,
      },
      orderBy: { createdAt: "desc" },
      take:    limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true, requestorId: true, approverId: true, actionKind: true,
        contextJson: true, state: true, expiresAt: true, resolvedAt: true, createdAt: true,
      },
    });

    const hasMore = rows.length > limit;
    const items   = hasMore ? rows.slice(0, limit) : rows;

    return ok({
      items:      items.map(toDTO),
      pagination: { cursor: hasMore ? items[items.length - 1].id : null, hasMore, total: null },
    });
  } catch (err) {
    console.error("[aihsafe/escalations/mine GET]", err);
    return serverError();
  }
}
