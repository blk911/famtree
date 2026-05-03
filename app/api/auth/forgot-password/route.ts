// POST /api/auth/forgot-password
// Generates a reset token and emails it. Always returns 200 to avoid user enumeration.

import { withApiTrace } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  return withApiTrace(req, "/api/auth/forgot-password", async (req: NextRequest) => {

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, firstName: true, email: true },
    });

    // Always respond the same way — don't reveal whether the email exists
    if (user) {
      // Expire any existing unused tokens for this user
      await (prisma as any).passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { expiresAt: new Date() },
      });

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      const record = await (prisma as any).passwordResetToken.create({
        data: { userId: user.id, expiresAt },
      });

      await sendPasswordResetEmail(user.email, user.firstName, record.token);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  });
}
