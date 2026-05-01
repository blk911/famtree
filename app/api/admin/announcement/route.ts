// app/api/admin/announcement/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

const isAdmin = (role: string) => role === "founder" || role === "admin";

// GET — current active announcement
export async function GET() {
  try {
    const user = await requireAuth();
    if (!isAdmin(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const announcement = await (prisma as any).siteAnnouncement.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ announcement: announcement ?? null });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// POST — publish new announcement (deactivates existing)
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (!isAdmin(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { title, body } = await req.json();
    if (!title?.trim() || !body?.trim()) {
      return NextResponse.json({ error: "Title and body required" }, { status: 400 });
    }

    // Deactivate all existing
    await (prisma as any).siteAnnouncement.updateMany({ data: { isActive: false } });

    const announcement = await (prisma as any).siteAnnouncement.create({
      data: { title: title.trim(), body: body.trim(), createdById: user.id, isActive: true },
    });

    return NextResponse.json({ announcement });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// PATCH — toggle isActive
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (!isAdmin(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id, isActive } = await req.json();
    const announcement = await (prisma as any).siteAnnouncement.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json({ announcement });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
