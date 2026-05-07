// Issue time-limited reset tokens + send email (forgot-password + admin assist).

import { prisma } from "@/lib/db/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

const RESET_TTL_MS = 60 * 60 * 1000;

/** Invalidate unused tokens, create a new row, send mail. Returns false if user missing. */
export async function issuePasswordResetForUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true },
  });
  if (!user) return false;

  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { expiresAt: new Date() },
  });

  const expiresAt = new Date(Date.now() + RESET_TTL_MS);
  const record = await prisma.passwordResetToken.create({
    data: { userId: user.id, expiresAt },
  });

  await sendPasswordResetEmail(user.email, user.firstName, record.token);
  return true;
}
