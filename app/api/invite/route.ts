// app/api/invite/route.ts

import { withApiTrace } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createInvite, normalizeInviteEmail } from "@/lib/invite";
import { sendInviteEmail } from "@/lib/email";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const VALID_RELATIONSHIPS = ["parent","child","sibling","spouse","so","bf","gf","other"] as const;

const sendSchema = z.object({
  recipientEmail: z.string().email("Please enter a valid email address"),
  relationship: z.enum(VALID_RELATIONSHIPS),
});

// POST /api/invite — send a new invite
export async function POST(req: NextRequest) {
  return withApiTrace(req, "/api/invite", async (req: NextRequest) => {

  try {
    const user = await requireAuth();
    const body = await req.json();
    const parsed = sendSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const { recipientEmail: rawRecipientEmail, relationship } = parsed.data;
    const recipientEmail = normalizeInviteEmail(rawRecipientEmail);

    // Can't invite yourself (match login: case-insensitive email)
    if (recipientEmail === normalizeInviteEmail(user.email)) {
      return NextResponse.json({ error: "You cannot invite yourself" }, { status: 400 });
    }

    // Can't invite someone already in the tree
    const alreadyMember = await prisma.user.findFirst({
      where: { email: { equals: recipientEmail, mode: "insensitive" } },
    });
    if (alreadyMember) {
      return NextResponse.json(
        { error: "This person already has a AMIHUMAN.NET account" },
        { status: 409 }
      );
    }

    const invite = await createInvite(user, recipientEmail, relationship);
    try {
      await sendInviteEmail(invite, user);
    } catch (mailErr) {
      console.error("[invite/send-email]", mailErr);
      return NextResponse.json(
        {
          error:
            "Invite was saved but the email could not be sent. Check RESEND / EMAIL configuration, or try again shortly.",
          inviteId: invite.id,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      inviteId: invite.id,
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("[invite/send]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  });
}

// GET /api/invite — list invites sent by current user
export async function GET(req: NextRequest) {
  return withApiTrace(req, "/api/invite", async (req: NextRequest) => {

  try {
    const user = await requireAuth();

    const invites = await prisma.invite.findMany({
      where: { senderId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        recipientEmail: true,
        relationship: true,
        status: true,
        attempts: true,
        expiresAt: true,
        acceptedAt: true,
        createdAt: true,
      },
    });

    const regEmails = Array.from(
      new Set(
        invites.filter((i) => i.status === "REGISTERED").map((i) => i.recipientEmail.toLowerCase()),
      ),
    );
    const recipients =
      regEmails.length === 0
        ? []
        : await prisma.user.findMany({
            where: {
              OR: regEmails.map((em) => ({
                email: { equals: em, mode: "insensitive" as const },
              })),
            },
            select: { id: true, email: true, firstName: true, lastName: true, status: true },
          });
    const emailKey = (e: string) => e.trim().toLowerCase();
    const byEmail = new Map(recipients.map((u) => [emailKey(u.email), u]));

    const enriched = invites.map((inv) => ({
      ...inv,
      recipientAccount:
        inv.status === "REGISTERED"
          ? (byEmail.get(emailKey(inv.recipientEmail)) ?? null)
          : null,
    }));

    return NextResponse.json({ invites: enriched });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("[invite/list]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  });
}

