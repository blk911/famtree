// POST /api/auth/forgot-password
// Generates a reset token and emails it. Always returns 200 to avoid user enumeration.

import { withApiTrace } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { issuePasswordResetForUser } from "@/lib/auth/password-reset";

export async function POST(req: NextRequest) {
  return withApiTrace(req, "/api/auth/forgot-password", async (req: NextRequest) => {

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true },
    });

    // Always respond the same way — don't reveal whether the email exists
    if (user) {
      await issuePasswordResetForUser(user.id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  });
}
