// POST /api/users/lookup-by-email — no trace wrapper; handler must own req.json() first touch.

import { appendApiErrorLog, getRequestIdFromRequest } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { isTrustUnitEligibleUser } from "@/lib/trust/isTrustUnitEligibleUser";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromRequest(req);
  try {
    await requireAuth();
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid or empty JSON body" },
        { status: 400, headers: { "x-request-id": requestId } },
      );
    }
    const email =
      raw && typeof raw === "object" && "email" in raw && typeof (raw as { email: unknown }).email === "string"
        ? (raw as { email: string }).email
        : "";
    const normalized = email.trim().toLowerCase();

    if (!normalized) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400, headers: { "x-request-id": requestId } },
      );
    }

    const row = await prisma.user.findFirst({
      where: { email: { equals: normalized, mode: "insensitive" } },
      select: { id: true, firstName: true, lastName: true, email: true, photoUrl: true, role: true },
    });

    const user = row
      ? {
          id: row.id,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          photoUrl: row.photoUrl,
        }
      : null;

    const trustUnitEligible = row ? isTrustUnitEligibleUser({ role: row.role }) : undefined;

    return NextResponse.json(
      { user, ...(trustUnitEligible !== undefined ? { trustUnitEligible } : {}) },
      { headers: { "x-request-id": requestId } },
    );
  } catch (err: unknown) {
    const e = err as { message?: string };
    if (e.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401, headers: { "x-request-id": requestId } },
      );
    }
    console.error("[lookup-by-email]", err);
    appendApiErrorLog({
      requestId,
      route: "/api/users/lookup-by-email POST",
      method: "POST",
      error: e.message ?? String(err),
      stack: (err as Error).stack,
    });
    return NextResponse.json(
      { error: "Internal server error", requestId },
      { status: 500, headers: { "x-request-id": requestId } },
    );
  }
}
