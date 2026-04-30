// lib/auth/index.ts
// JWT creation/verification, password hashing, session helpers

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import type { User } from "@prisma/client";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-in-production"
);
const COOKIE_NAME = "famtree_session";
const EXPIRES_IN = 60 * 60 * 24 * 7; // 7 days in seconds

// ─── Password ────────────────────────────────────────────────
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── JWT ─────────────────────────────────────────────────────
export async function createJWT(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRES_IN}s`)
    .sign(SECRET);
}

export async function verifyJWT(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as { sub: string };
  } catch {
    return null;
  }
}

// ─── Session cookie ──────────────────────────────────────────
export async function setSessionCookie(userId: string): Promise<void> {
  const token = await createJWT(userId);
  const expiresAt = new Date(Date.now() + EXPIRES_IN * 1000);

  // Store in DB for revocation support
  await prisma.session.create({
    data: { userId, token, expiresAt },
  });

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (token) {
    // Invalidate in DB
    await prisma.session.deleteMany({ where: { token } }).catch(() => null);
  }
  cookies().delete(COOKIE_NAME);
}

// ─── Current user ────────────────────────────────────────────
export async function getCurrentUser(): Promise<User | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyJWT(token);
  if (!payload?.sub) return null;

  // Check session still valid in DB
  const session = await prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
  });
  if (!session) return null;

  return prisma.user.findUnique({ where: { id: payload.sub } });
}

// ─── Require auth (for server components / route handlers) ───
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
