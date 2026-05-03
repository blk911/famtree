// app/api/auth/register/route.ts

import { withApiTrace } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";
import { z } from "zod";

const registerSchema = z.object({
  email:       z.string().email(),
  password:    z.string().min(8, "Password must be at least 8 characters"),
  firstName:   z.string().min(1).max(80),
  lastName:    z.string().min(1).max(80),
  dateOfBirth: z.string().optional(),
  inviteToken: z.string().uuid().optional(), // absent = founder registration
});

export async function POST(req: NextRequest) {
  return withApiTrace(req, "/api/auth/register", async (req: NextRequest) => {

  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      const firstMessage = Object.values(fields).flat()[0];
      return NextResponse.json(
        { error: firstMessage ?? "Validation failed", issues: fields },
        { status: 400 }
      );
    }

    const { email, password, firstName, lastName, dateOfBirth, inviteToken } = parsed.data;

    // Check email not already taken
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // If invite token provided — verify it was already accepted (identity challenge passed)
    let inviteRelationship: string | null = null;
    let invitedById: string | null = null;
    if (inviteToken) {
      const invite = await prisma.invite.findUnique({ where: { token: inviteToken } });
      if (!invite || invite.status !== "ACCEPTED") {
        return NextResponse.json(
          { error: "Invalid or unverified invite token. Please complete the identity challenge first." },
          { status: 403 }
        );
      }
      if (invite.recipientEmail !== email) {
        return NextResponse.json(
          { error: "Email does not match the invited address." },
          { status: 403 }
        );
      }
      inviteRelationship = invite.relationship ?? null;
      invitedById = invite.senderId;
    }

    // Determine role
    const isFirstUser = (await prisma.user.count()) === 0;
    const role = isFirstUser ? "founder" : "member";

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        role,
        relationship: inviteRelationship,
        invitedById: invitedById ?? undefined,
        emailVerified: true,
        profile: {
          create: {},
        },
      },
    });

    // Mark invite as fully consumed — terminal state, closes reuse window
    if (inviteToken) {
      await prisma.invite.update({
        where: { token: inviteToken },
        data: { status: "REGISTERED" },
      });
    }

    await setSessionCookie(user.id, req);
    await sendWelcomeEmail(user).catch(console.error); // non-blocking

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  });
}
