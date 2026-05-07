// POST /api/auth/change-password — logged-in user updates password.

import { withApiTrace } from "@/lib/trace";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { hashPassword, requireAuth, verifyPassword } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const bodySchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  })
  .strict();

export async function POST(req: NextRequest) {
  return withApiTrace(req, "/api/auth/change-password", async () => {
    try {
      const user = await requireAuth();
      const raw = await req.json();
      const parsed = bodySchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Current password and a new password (8+ characters) are required" },
          { status: 400 },
        );
      }

      const { currentPassword, newPassword } = parsed.data;

      const row = await prisma.user.findUnique({
        where: { id: user.id },
        select: { passwordHash: true },
      });
      if (!row || !(await verifyPassword(currentPassword, row.passwordHash))) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }

      const passwordHash = await hashPassword(newPassword);

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      const cookieToken = cookies().get(SESSION_COOKIE_NAME)?.value;
      if (cookieToken) {
        await prisma.session.deleteMany({
          where: { userId: user.id, NOT: { token: cookieToken } },
        });
      } else {
        await prisma.session.deleteMany({ where: { userId: user.id } });
      }

      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

      return NextResponse.json({ success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
      console.error("[change-password]", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}
