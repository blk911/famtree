// app/api/invite/[token]/route.ts

import { withApiTrace } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { getInviteByToken, verifyIdentityChallenge } from "@/lib/invite";
import { z } from "zod";

// GET /api/invite/[token] — get invite info (shows sender photo, no name)
export async function GET(_req: NextRequest, routeCtx: { params: { token: string } }) {
  return withApiTrace(_req, "/api/invite/[token]", async (_req: NextRequest, routeCtx) => {
const { params } = routeCtx;

  const invite = await getInviteByToken(params.token);

  if (!invite) {
    return NextResponse.json({ error: "Invite not found or expired" }, { status: 404 });
  }

  // Return sender photo but NOT their name — that's the challenge
  return NextResponse.json({
    inviteId: invite.id,
    recipientEmail: invite.recipientEmail,
    senderPhotoUrl: invite.sender.photoUrl,
    expiresAt: invite.expiresAt,
    attemptsLeft: invite.maxAttempts - invite.attempts,
  });
  }, routeCtx);
}

const verifySchema = z.object({
  guessedName: z.string().min(1, "Please enter a name"),
});

// POST /api/invite/[token] — submit name guess
export async function POST(req: NextRequest, routeCtx: { params: { token: string } }) {
  return withApiTrace(req, "/api/invite/[token]", async (req: NextRequest, routeCtx) => {
const { params } = routeCtx;

  try {
    const body = await req.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const result = await verifyIdentityChallenge(params.token, parsed.data.guessedName);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Identity confirmed! Proceed to register your account.",
        token: params.token, // passed to /register
      });
    }

    return NextResponse.json(
      {
        success: false,
        reason: result.reason,
        attemptsLeft: result.attemptsLeft,
        message:
          result.reason === "expired"
            ? "Too many wrong attempts. This invite has expired."
            : result.reason === "wrong_name"
              ? `That doesn't match. ${result.attemptsLeft} attempt${result.attemptsLeft === 1 ? "" : "s"} remaining.`
              : "Invite not found or expired.",
      },
      { status: 200 } // 200 so the client can handle gracefully
    );
  } catch (err) {
    console.error("[invite/verify]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  }, routeCtx);
}
