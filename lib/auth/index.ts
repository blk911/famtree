// lib/auth/index.ts
// JWT creation/verification, password hashing, session helpers

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { User } from "@prisma/client";
import { getJwtSecretKey } from "./jwt-secret";
import { SESSION_COOKIE_NAME } from "./session-cookie";

const COOKIE_NAME = SESSION_COOKIE_NAME;
const EXPIRES_IN = 60 * 60 * 24 * 7; // 7 days in seconds

/** Core columns present before identity-change migration; avoids findUnique * when `selfServiceIdentityChangesRemaining` is missing in DB. */
const SESSION_USER_CORE_SELECT = {
  id: true,
  email: true,
  passwordHash: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  photoUrl: true,
  role: true,
  status: true,
  relationship: true,
  emailVerified: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  invitedById: true,
} as const;

async function fetchSelfServiceRemainingSafe(userId: string): Promise<number> {
  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { selfServiceIdentityChangesRemaining: true },
    });
    return row?.selfServiceIdentityChangesRemaining ?? 1;
  } catch {
    return 1;
  }
}

function cookieSecure(reqHeaders?: Headers): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  if (process.env.VERCEL === "1") return true;
  const proto = reqHeaders?.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return proto === "https";
}

// ─── Password ────────────────────────────────────────────────
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash || hash.length < 20) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

// ─── JWT ─────────────────────────────────────────────────────
export async function createJWT(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRES_IN}s`)
    .sign(getJwtSecretKey());
}

export async function verifyJWT(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return payload as { sub: string };
  } catch {
    return null;
  }
}

// ─── Session cookie ──────────────────────────────────────────
export async function setSessionCookie(userId: string, req?: Pick<NextRequest, "headers">): Promise<void> {
  const token = await createJWT(userId);
  const expiresAt = new Date(Date.now() + EXPIRES_IN * 1000);

  await prisma.session.create({
    data: { userId, token, expiresAt },
  });

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: cookieSecure(req?.headers),
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  try {
    const token = cookies().get(COOKIE_NAME)?.value;
    if (token) {
      await prisma.session.deleteMany({ where: { token } }).catch(() => null);
    }
    cookies().delete(COOKIE_NAME);
  } catch (err) {
    console.error("[clearSessionCookie]", err);
  }
}

// Session + status: "active" is required to be treated as logged in.
// This is the account's real status (set by admin / system) — not per-viewer tree prefs.
export async function getCurrentUser(): Promise<User | null> {
  try {
    const token = cookies().get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifyJWT(token);
    if (!payload?.sub) return null;

    const session = await prisma.session.findFirst({
      where: { token, expiresAt: { gt: new Date() } },
    });
    if (!session) return null;

    const core = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: SESSION_USER_CORE_SELECT,
    });
    if (!core) return null;

    if (core.status !== "active") {
      await prisma.session.deleteMany({ where: { userId: core.id } }).catch(() => null);
      return null;
    }

    const selfServiceIdentityChangesRemaining = await fetchSelfServiceRemainingSafe(core.id);

    return { ...core, selfServiceIdentityChangesRemaining } as User;
  } catch (err) {
    console.error("[getCurrentUser]", err);
    return null;
  }
}

// ─── Require auth (for server components / route handlers) ───
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

