// app/api/invite/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createInvite } from "@/lib/invite";
import { sendInviteEmail } from "@/lib/email";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const sendSchema = z.object({
  recipientEmail: z.string().email("Please enter a valid email address"),
});

// POST /api/invite — send a new invite
export async function POST(req: NextRequest) {
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

    const { recipientEmail } = parsed.data;

    // Can't invite yourself
    if (recipientEmail === user.email) {
      return NextResponse.json({ error: "You cannot invite yourself" }, { status: 400 });
    }

    // Can't invite someone already in the tree
    const alreadyMember = await prisma.user.findUnique({ where: { email: recipientEmail } });
    if (alreadyMember) {
      return NextResponse.json(
        { error: "This person already has a AMIHUMAN.NET account" },
        { status: 409 }
      );
    }

    const invite = await createInvite(user, recipientEmail);
    await sendInviteEmail(invite, user);

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
}

// GET /api/invite — list invites sent by current user
export async function GET() {
  try {
    const user = await requireAuth();

    const invites = await prisma.invite.findMany({
      where: { senderId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        recipientEmail: true,
        status: true,
        attempts: true,
        expiresAt: true,
        acceptedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ invites });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

