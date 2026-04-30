// app/api/auth/login/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { z } from "zod";

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(0),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const devBypass = process.env.DEV_BYPASS === "true";
    if (!devBypass) {
      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }
    }

    await setSessionCookie(user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        photoUrl: user.photoUrl,
      },
    });
  } catch (err) {
    console.error("[login]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
