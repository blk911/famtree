// lib/invite/index.ts
// Invite token creation, identity challenge verification (fuzzy name match)

import { prisma } from "@/lib/db/prisma";
import Fuse from "fuse.js";
import { v4 as uuidv4 } from "uuid";
import type { Invite, User } from "@prisma/client";

const INVITE_EXPIRES_DAYS = 7;
const MAX_ATTEMPTS = 3;

// ─── Create an invite ────────────────────────────────────────
export async function createInvite(
  sender: User,
  recipientEmail: string
): Promise<Invite> {
  // Prevent duplicate pending invites to the same address from same sender
  const existing = await prisma.invite.findFirst({
    where: {
      senderId: sender.id,
      recipientEmail,
      status: "PENDING",
    },
  });
  if (existing) return existing;

  return prisma.invite.create({
    data: {
      senderId: sender.id,
      recipientEmail,
      token: uuidv4(),
      expiresAt: new Date(Date.now() + INVITE_EXPIRES_DAYS * 86_400_000),
    },
  });
}

// ─── Fetch a valid invite by token ───────────────────────────
export async function getInviteByToken(
  token: string
): Promise<(Invite & { sender: User }) | null> {
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { sender: true },
  });

  if (!invite) return null;
  if (invite.status !== "PENDING") return null;
  if (invite.expiresAt < new Date()) {
    // Auto-expire
    await prisma.invite.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
    return null;
  }

  return invite;
}

// ─── Verify the identity challenge ───────────────────────────
export type VerifyResult =
  | { success: true; invite: Invite }
  | { success: false; reason: "wrong_name" | "expired" | "not_found"; attemptsLeft: number };

export async function verifyIdentityChallenge(
  token: string,
  guessedName: string
): Promise<VerifyResult> {
  const record = await getInviteByToken(token);

  if (!record) {
    return { success: false, reason: "not_found", attemptsLeft: 0 };
  }

  const sender = record.sender;
  const fullName = `${sender.firstName} ${sender.lastName}`;

  // Fuzzy match: compare guess against firstName, lastName, full name
  const candidates = [
    sender.firstName,
    sender.lastName,
    fullName,
    `${sender.lastName} ${sender.firstName}`, // reversed
  ];

  const fuse = new Fuse(candidates, { threshold: 0.35, includeScore: true });
  const results = fuse.search(guessedName.trim());
  const matched = results.length > 0 && (results[0].score ?? 1) < 0.35;

  if (matched) {
    // Mark as accepted
    const updated = await prisma.invite.update({
      where: { id: record.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    return { success: true, invite: updated };
  }

  // Wrong guess — increment attempts
  const updated = await prisma.invite.update({
    where: { id: record.id },
    data: {
      attempts: { increment: 1 },
      status: record.attempts + 1 >= MAX_ATTEMPTS ? "EXPIRED" : "PENDING",
    },
  });

  const attemptsLeft = Math.max(0, MAX_ATTEMPTS - updated.attempts);

  if (updated.status === "EXPIRED") {
    return { success: false, reason: "expired", attemptsLeft: 0 };
  }

  return { success: false, reason: "wrong_name", attemptsLeft };
}
