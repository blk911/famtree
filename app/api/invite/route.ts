// app/api/invite/route.ts
// IMPORTANT: No withApiTrace / withApiTraceLite wrapper — those ran middleware-like logic before the handler.
// Invite POST must be the first consumer of req.json() (Undici/Next Request stream quirks).

import { appendApiErrorLog, getRequestIdFromRequest } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { normalizeInviteEmail } from "@/lib/invite";
import {
  InviteRoutingError,
  routeInviteByIntent,
} from "@/lib/aihsafe/invites/routeByIntent";
import { INVITE_INTENTS, INVITEE_AGE_BRACKETS } from "@/types/aihsafe/invite-intent";
import { sendInviteEmail } from "@/lib/email";
import { prisma } from "@/lib/db/prisma";
import { enrichInvitesWithRegisteredAccounts, listSentInvitesForSender } from "@/lib/invite/sentForSender";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapPrismaHttp(err: unknown): { status: number; message: string } | null {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P1001" || err.code === "P1002" || err.code === "P1017") {
      return {
        status: 503,
        message: "Database is temporarily unavailable. Try again in a moment.",
      };
    }
    /** Table/column missing — production DB not migrated (e.g. `studios`, `invites`). */
    if (err.code === "P2021" || err.code === "P2022") {
      return {
        status: 503,
        message:
          "Database schema is out of date for this deployment. Apply pending Prisma migrations to production (e.g. `prisma migrate deploy`).",
      };
    }
    if (err.code === "P2002") {
      return {
        status: 409,
        message: "This invite conflicts with an existing record.",
      };
    }
  }
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return { status: 503, message: "Database connection failed. Try again shortly." };
  }
  return null;
}

const VALID_RELATIONSHIPS = ["parent", "child", "sibling", "spouse", "so", "frnd", "other"] as const;

const sendSchema = z
  .object({
    recipientEmail:      z.string().email("Please enter a valid email address"),
    relationship:        z.enum(VALID_RELATIONSHIPS).optional(),
    inviteIntent:        z.enum(INVITE_INTENTS as [string, ...string[]]).optional(),
    inviteeAgeBracket:   z.enum(INVITEE_AGE_BRACKETS as [string, ...string[]]).optional(),
    stewardDeclaration:  z.boolean().optional(),
    targetTrustUnitId:   z.string().min(1).optional(),
    targetFamilyUnitId:  z.string().min(1).optional(),
  })
  .refine((d) => d.relationship || d.inviteIntent, {
    message: "Select a relationship or invite type",
    path:    ["relationship"],
  });

const noStoreInviteJson = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
} as const;

// POST /api/invite — send a new invite
export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromRequest(req);
  try {
    const user = await requireAuth();
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid or empty JSON body" },
        { status: 400, headers: { "x-request-id": requestId } },
      );
    }
    const parsed = sendSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400, headers: { "x-request-id": requestId } },
      );
    }

    const {
      recipientEmail: rawRecipientEmail,
      relationship,
      inviteIntent,
      inviteeAgeBracket,
      stewardDeclaration,
      targetTrustUnitId,
      targetFamilyUnitId,
    } = parsed.data;
    const recipientEmail = normalizeInviteEmail(rawRecipientEmail);

    if (recipientEmail === normalizeInviteEmail(user.email)) {
      return NextResponse.json(
        { error: "You cannot invite yourself" },
        { status: 400, headers: { "x-request-id": requestId } },
      );
    }

    const alreadyMember = await prisma.user.findFirst({
      where: { email: { equals: recipientEmail, mode: "insensitive" } },
    });
    if (alreadyMember) {
      return NextResponse.json(
        { error: "This person already has a AMIHUMAN.NET account" },
        { status: 409, headers: { "x-request-id": requestId } },
      );
    }

    let invite;
    try {
      const routed = await routeInviteByIntent({
        sender:              user,
        recipientEmail,
        relationship:        relationship ?? null,
        inviteIntent:        inviteIntent ?? null,
        inviteeAgeBracket:   inviteeAgeBracket ?? null,
        stewardDeclaration:  stewardDeclaration ?? false,
        targetTrustUnitId:   targetTrustUnitId ?? null,
        targetFamilyUnitId:  targetFamilyUnitId ?? null,
        allowAutoTrustUnit:  false,
      });
      invite = routed.invite;
    } catch (err) {
      if (err instanceof InviteRoutingError) {
        return NextResponse.json(
          { error: err.message, code: err.code },
          { status: 400, headers: { "x-request-id": requestId } },
        );
      }
      throw err;
    }

    try {
      await sendInviteEmail(invite, user);
    } catch (mailErr) {
      console.error("[invite/send-email]", mailErr);
      return NextResponse.json(
        {
          error:
            "Invite was saved but the email could not be sent. Check RESEND / EMAIL configuration, or try again shortly.",
          inviteId: invite.id,
          recipientEmail: invite.recipientEmail,
          status: invite.status,
        relationship: invite.relationship,
        inviteIntent: invite.inviteIntent,
        createdAt: invite.createdAt.toISOString(),
      },
      { status: 502, headers: { "x-request-id": requestId } },
      );
    }

    return NextResponse.json(
      {
        success: true,
        inviteId: invite.id,
        recipientEmail: invite.recipientEmail,
        status: invite.status,
        relationship: invite.relationship,
        inviteIntent: invite.inviteIntent,
        createdAt: invite.createdAt.toISOString(),
      },
      { headers: { "x-request-id": requestId } },
    );
  } catch (err: unknown) {
    const e = err as { message?: string };
    if (e.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401, headers: { "x-request-id": requestId } },
      );
    }
    const mapped = mapPrismaHttp(err);
    if (mapped) {
      console.error("[invite/send prisma]", err);
      return NextResponse.json(
        { error: mapped.message, requestId },
        { status: mapped.status, headers: { "x-request-id": requestId } },
      );
    }
    console.error("[invite/send]", err);
    appendApiErrorLog({
      requestId,
      route: "/api/invite POST",
      method: "POST",
      error: e.message ?? String(err),
      stack: (err as Error).stack,
    });
    return NextResponse.json(
      { error: "Internal server error", requestId },
      { status: 500, headers: { "x-request-id": requestId } },
    );
  }
}

// GET /api/invite — list invites sent by current user
export async function GET(req: NextRequest) {
  const requestId = getRequestIdFromRequest(req);
  try {
    const user = await requireAuth();

    const invites = await listSentInvitesForSender(user.id);
    let enriched;
    try {
      enriched = await enrichInvitesWithRegisteredAccounts(invites);
    } catch (enrichErr) {
      console.error("[invite/list enrich]", enrichErr);
      enriched = invites.map((inv) => ({ ...inv, recipientAccount: null }));
    }

    return NextResponse.json(
      { invites: enriched },
      {
        headers: {
          "x-request-id": requestId,
          ...noStoreInviteJson,
        },
      },
    );
  } catch (err: unknown) {
    const e = err as { message?: string };
    if (e.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401, headers: { "x-request-id": requestId } },
      );
    }
    const mapped = mapPrismaHttp(err);
    if (mapped) {
      console.error("[invite/list prisma]", err);
      return NextResponse.json(
        { error: mapped.message, requestId },
        { status: mapped.status, headers: { "x-request-id": requestId, ...noStoreInviteJson } },
      );
    }
    console.error("[invite/list]", err);
    appendApiErrorLog({
      requestId,
      route: "/api/invite GET",
      method: "GET",
      error: e.message ?? String(err),
      stack: (err as Error).stack,
    });
    return NextResponse.json(
      { error: "Internal server error", requestId },
      { status: 500, headers: { "x-request-id": requestId } },
    );
  }
}
