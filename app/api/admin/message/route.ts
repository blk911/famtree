// app/api/admin/message/route.ts
// Admin sends a private message to a member:
//   1. Creates a private post (visibleTo = [recipientId])
//   2. Fires an email notification via Resend

import { withApiTrace } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { sendAdminMessageEmail } from "@/lib/email";

const isAdmin = (role: string) => role === "founder" || role === "admin";

export async function POST(req: NextRequest) {
  return withApiTrace(req, "/api/admin/message", async (req: NextRequest) => {

  try {
    const admin = await requireAuth();
    if (!isAdmin(admin.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { recipientId, body } = await req.json();
    if (!recipientId || !body?.trim()) {
      return NextResponse.json({ error: "recipientId and body required" }, { status: 400 });
    }

    // Look up recipient
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    // Look up admin's profile (needed to create the post)
    const adminProfile = await prisma.profile.findUnique({
      where: { userId: admin.id },
      select: { id: true },
    });
    if (!adminProfile) {
      return NextResponse.json({ error: "Admin profile not found" }, { status: 404 });
    }

    // 1 — Create private post visible only to the recipient
    const post = await (prisma.post.create as any)({
      data: {
        profileId: adminProfile.id,
        body: body.trim(),
      },
    });

    await (prisma as any).postVisibility.create({
      data: { postId: post.id, userId: recipientId },
    });

    // 2 — Send email notification (fire-and-forget; don't fail the request if email fails)
    sendAdminMessageEmail(
      { email: recipient.email, firstName: recipient.firstName },
      { firstName: admin.firstName, lastName: admin.lastName },
    ).catch((err) => console.error("[admin-message] email failed:", err));

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("[admin-message]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  });
}
