// app/api/auth/register/route.ts

import { withApiTrace } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { normalizeInviteEmail } from "@/lib/invite";
import { sendWelcomeEmail } from "@/lib/email";
import { resolveTrustUnitPendingInvitesOnRegister } from "@/lib/trust/tuProposal";
import { materializeInviteOutcome } from "@/lib/aihsafe/invites/materializeInviteOutcome";
import {
  InviteRegisterValidationError,
  validateRegistrationAgainstInvite,
} from "@/lib/aihsafe/invites/validateRegisterInvite";
import { isBusinessInviteIntent } from "@/types/aihsafe/invite-intent";
import { resolveInviteIntentFromRow } from "@/lib/aihsafe/invites/invite-fields";
import { shouldResolveTrustUnitPendingOnRegister } from "@/lib/aihsafe/invites/inviteRegisterPolicy";
import { isHumanTrustEligible } from "@/lib/trust/isHumanTrustEligible";
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
    let consumedInviteId: string | null = null;
    let acceptedInvite: Awaited<ReturnType<typeof prisma.invite.findUnique>> = null;
    const parsedDob = dateOfBirth ? new Date(dateOfBirth) : null;

    if (inviteToken) {
      const invite = await prisma.invite.findUnique({ where: { token: inviteToken } });
      if (!invite || invite.status !== "ACCEPTED") {
        return NextResponse.json(
          { error: "Invalid or unverified invite token. Please complete the identity challenge first." },
          { status: 403 }
        );
      }
      if (normalizeInviteEmail(invite.recipientEmail) !== normalizeInviteEmail(email)) {
        return NextResponse.json(
          { error: "Email does not match the invited address." },
          { status: 403 }
        );
      }
      try {
        validateRegistrationAgainstInvite(invite, parsedDob);
      } catch (err) {
        if (err instanceof InviteRegisterValidationError) {
          return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
        }
        throw err;
      }
      inviteRelationship = invite.relationship ?? null;
      invitedById = invite.sponsorUserId ?? invite.senderId;
      consumedInviteId = invite.id;
      acceptedInvite = invite;
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
        dateOfBirth: parsedDob,
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
    if (inviteToken && consumedInviteId) {
      await prisma.invite.update({
        where: { token: inviteToken },
        data: { status: "REGISTERED" },
      });
      const regIntent = acceptedInvite ? resolveInviteIntentFromRow(acceptedInvite) : null;
      if (shouldResolveTrustUnitPendingOnRegister(regIntent)) {
        await resolveTrustUnitPendingInvitesOnRegister(user.id, consumedInviteId);
      }
    }

    // Sponsor ↔ new member bond (invite path only) — not used for business-only authority.
    if (inviteToken && invitedById && acceptedInvite) {
      const intent = resolveInviteIntentFromRow(acceptedInvite);
      const sponsor = await prisma.user.findUnique({
        where: { id: invitedById },
        select: { id: true, role: true, email: true },
      });
      if (
        !isBusinessInviteIntent(intent) &&
        sponsor &&
        isHumanTrustEligible(sponsor) &&
        isHumanTrustEligible({ role: user.role, email: user.email })
      ) {
        await prisma.connectionRequest.upsert({
          where: {
            requesterId_targetId: {
              requesterId: invitedById,
              targetId: user.id,
            },
          },
          create: {
            requesterId: invitedById,
            targetId: user.id,
            status: "ACCEPTED",
          },
          update: {
            status: "ACCEPTED",
          },
        });
      }
    }

    if (acceptedInvite) {
      await materializeInviteOutcome(user.id, acceptedInvite, user.dateOfBirth ?? null);
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
