// GET /api/identity-change — eligibility + open request (requester view)
// POST /api/identity-change — submit a new request

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import {
  IC_STATUS,
  getActiveInviteeIds,
  refreshAckPhase,
} from "@/lib/identity-change/service";
import { getProfilePhoneSafe } from "@/lib/profile/phone";

const submitSchema = z
  .object({
    proposedFirstName: z.string().min(1).max(80).optional(),
    proposedLastName: z.string().min(1).max(80).optional(),
    proposedEmail: z.string().email().optional(),
    proposedPhone: z.string().max(40).optional().nullable(),
    requesterNote: z.string().min(10).max(4000),
  })
  .strict();

function identitySchemaUnsupported(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return err.code === "P2021" || err.code === "P2022";
  }
  return false;
}

export async function GET() {
  try {
    const user = await requireAuth();

    try {
      const prevPhoneVal = await getProfilePhoneSafe(user.id);

      const openRequest = await prisma.identityChangeRequest.findFirst({
      where: {
        requesterId: user.id,
        status: { in: [IC_STATUS.PENDING_ACKS, IC_STATUS.PENDING_ADMIN] },
      },
      include: {
        acknowledgments: {
          select: {
            id: true,
            inviteeId: true,
            response: true,
            respondedAt: true,
            invitee: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (openRequest?.status === IC_STATUS.PENDING_ACKS) {
      await refreshAckPhase(openRequest.id);
    }

    const fresh =
      openRequest &&
      (await prisma.identityChangeRequest.findFirst({
        where: {
          requesterId: user.id,
          status: { in: [IC_STATUS.PENDING_ACKS, IC_STATUS.PENDING_ADMIN] },
        },
        include: {
          acknowledgments: {
            select: {
              id: true,
              inviteeId: true,
              response: true,
              respondedAt: true,
              invitee: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }));

      const inviteePreviewCount = await prisma.user.count({
        where: { invitedById: user.id, status: "active" },
      });

      return NextResponse.json({
        selfServiceRemaining: user.selfServiceIdentityChangesRemaining,
        current: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: prevPhoneVal ?? "",
        },
        inviteePreviewCount,
        openRequest: fresh
          ? {
              id: fresh.id,
              status: fresh.status,
              expiresAt: fresh.expiresAt,
              hasConflict: fresh.hasConflict,
              changeName: fresh.changeName,
              changeEmail: fresh.changeEmail,
              changePhone: fresh.changePhone,
              proposedFirstName: fresh.proposedFirstName,
              proposedLastName: fresh.proposedLastName,
              proposedEmail: fresh.proposedEmail,
              proposedPhone: fresh.proposedPhone,
              requesterNote: fresh.requesterNote,
              acknowledgments: fresh.acknowledgments,
            }
          : null,
      });
    } catch (inner: unknown) {
      if (!identitySchemaUnsupported(inner)) throw inner;
      console.error("[identity-change GET] identity tables/columns missing — returning degraded payload", inner);
      const prevPhoneVal = await getProfilePhoneSafe(user.id);
      let inviteePreviewCount = 0;
      try {
        inviteePreviewCount = await prisma.user.count({
          where: { invitedById: user.id, status: "active" },
        });
      } catch {
        inviteePreviewCount = 0;
      }
      return NextResponse.json({
        selfServiceRemaining: user.selfServiceIdentityChangesRemaining,
        current: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: prevPhoneVal ?? "",
        },
        inviteePreviewCount,
        openRequest: null,
        identityUnavailable: true,
      });
    }
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("[identity-change GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (user.selfServiceIdentityChangesRemaining <= 0) {
      return NextResponse.json(
        {
          error:
            "Self-service identity updates are exhausted for your account. Contact an admin to unlock another change (e.g. divorce, legal name, recovery).",
        },
        { status: 403 },
      );
    }

    const existingOpen = await prisma.identityChangeRequest.findFirst({
      where: {
        requesterId: user.id,
        status: { in: [IC_STATUS.PENDING_ACKS, IC_STATUS.PENDING_ADMIN] },
      },
    });
    if (existingOpen) {
      return NextResponse.json(
        { error: "You already have an identity change in progress. Withdraw it first or wait for admin." },
        { status: 409 },
      );
    }

    const raw = await req.json();
    const parsed = submitSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const prevPhone = await getProfilePhoneSafe(user.id);
    let { proposedFirstName, proposedLastName, proposedEmail, proposedPhone, requesterNote } = parsed.data;

    const namePart = !!(proposedFirstName?.trim() || proposedLastName?.trim());
    const bothNames = !!(proposedFirstName?.trim() && proposedLastName?.trim());
    if (namePart && !bothNames) {
      return NextResponse.json(
        { error: "Provide both first and last name when changing your legal name." },
        { status: 400 },
      );
    }

    proposedPhone =
      proposedPhone === undefined || proposedPhone === null
        ? undefined
        : proposedPhone.trim() === ""
          ? ""
          : proposedPhone.trim();

    const normEmail = proposedEmail?.trim().toLowerCase();

    const changeName =
      !!(proposedFirstName && proposedLastName) &&
      (proposedFirstName.trim() !== user.firstName || proposedLastName.trim() !== user.lastName);

    const changeEmail = !!normEmail && normEmail !== user.email.toLowerCase();

    const changePhone = proposedPhone !== undefined && proposedPhone !== (prevPhone ?? "");

    if (!changeName && !changeEmail && !changePhone) {
      return NextResponse.json(
        { error: "Change at least one of name, email, or mobile number." },
        { status: 400 },
      );
    }

    const inviteeIds = await getActiveInviteeIds(user.id);
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const status = inviteeIds.length === 0 ? IC_STATUS.PENDING_ADMIN : IC_STATUS.PENDING_ACKS;

    const created = await prisma.identityChangeRequest.create({
      data: {
        requesterId: user.id,
        status,
        prevFirstName: user.firstName,
        prevLastName: user.lastName,
        prevEmail: user.email,
        prevPhone,
        proposedFirstName: changeName ? proposedFirstName!.trim() : null,
        proposedLastName: changeName ? proposedLastName!.trim() : null,
        proposedEmail: changeEmail ? normEmail! : null,
        proposedPhone: changePhone ? (proposedPhone === "" ? null : proposedPhone) : null,
        changeName,
        changeEmail,
        changePhone,
        requesterNote: requesterNote.trim(),
        expiresAt,
        ...(inviteeIds.length > 0 && {
          acknowledgments: {
            create: inviteeIds.map((inviteeId) => ({ inviteeId })),
          },
        }),
      },
    });

    return NextResponse.json({ success: true, request: { id: created.id, status: created.status } });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("[identity-change POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
