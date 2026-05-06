import { prisma } from "@/lib/db/prisma";

/** Columns returned everywhere we list “invites I sent”. Keeps dashboard /invite UI / API in sync. */
export const sentInviteListSelect = {
  id: true,
  recipientEmail: true,
  relationship: true,
  status: true,
  attempts: true,
  expiresAt: true,
  acceptedAt: true,
  createdAt: true,
} as const;

export type SentInviteListRow = {
  id: string;
  recipientEmail: string;
  relationship: string | null;
  status: string;
  attempts: number;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
};

/**
 * Single query path for “invites sent by this user” (dashboard strip + InviteClient loader +
 * GET /api/invite before enrichment).
 */
export async function listSentInvitesForSender(senderId: string, opts?: { take?: number }) {
  return prisma.invite.findMany({
    where: { senderId },
    orderBy: { createdAt: "desc" },
    ...(opts?.take != null ? { take: opts.take } : {}),
    select: sentInviteListSelect,
  });
}

/** Recipient profiles for REGISTERED invites — same enrichment GET /api/invite exposes to clients. */
export async function enrichInvitesWithRegisteredAccounts<
  T extends Pick<SentInviteListRow, "status" | "recipientEmail">,
>(
  invites: T[],
): Promise<
  (T & {
    recipientAccount: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      status: string;
    } | null;
  })[]
> {
  const regEmails = Array.from(
    new Set(
      invites
        .filter(
          (i) =>
            i.status === "REGISTERED" &&
            typeof i.recipientEmail === "string" &&
            i.recipientEmail.trim().length > 0,
        )
        .map((i) => (i.recipientEmail as string).trim().toLowerCase()),
    ),
  );
  const recipients =
    regEmails.length === 0
      ? []
      : await prisma.user.findMany({
          where: {
            OR: regEmails.map((em) => ({
              email: { equals: em, mode: "insensitive" as const },
            })),
          },
          select: { id: true, email: true, firstName: true, lastName: true, status: true },
        });
  const emailKey = (e: string) => e.trim().toLowerCase();
  const byEmail = new Map(recipients.map((u) => [emailKey(u.email), u]));

  return invites.map((inv) => {
    const email =
      typeof inv.recipientEmail === "string" ? inv.recipientEmail : "";
    return {
      ...inv,
      recipientAccount:
        inv.status === "REGISTERED"
          ? (byEmail.get(emailKey(email)) ?? null)
          : null,
    };
  });
}
