// POST /api/auth/reset-password
// Validates the token and sets a new password.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password || password.length < 8) {
      return NextResponse.json({ error: "Token and a password of at least 8 characters are required" }, { status: 400 });
    }

    const record = await (prisma as any).passwordResetToken.findUnique({
      where: { token },
    });

    if (!record) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
    }
    if (record.usedAt) {
      return NextResponse.json({ error: "This reset link has already been used" }, { status: 400 });
    }
    if (new Date(record.expiresAt) < new Date()) {
      return NextResponse.json({ error: "This reset link has expired — please request a new one" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await Promise.all([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      (prisma as any).passwordResetToken.update({
        where: { token },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
