// app/api/invite/lookup/route.ts
// Public endpoint — no auth required (invitee doesn't have an account yet)
// Returns invite token + sender photo for the homepage challenge flow

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.toLowerCase().trim();
  if (!email) return NextResponse.json({ found: false });

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return NextResponse.json({ found: false, alreadyRegistered: true });
  }

  const invite = await prisma.invite.findFirst({
    where: { recipientEmail: email, status: { in: ["PENDING", "ACCEPTED"] } },
    include: { sender: { select: { photoUrl: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (!invite) return NextResponse.json({ found: false });

  // Return token + photo ONLY — never leak sender name here
  return NextResponse.json({
    found: true,
    token: invite.token,
    status: invite.status,
    senderPhotoUrl: invite.sender.photoUrl,
  });
}
