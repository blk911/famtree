import { withApiTrace } from "@/lib/trace";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// POST /api/waitlist — saves interested users who don't have an invite yet
export async function POST(req: NextRequest) {
  return withApiTrace(req, "/api/waitlist", async (req: NextRequest) => {

  try {
    const body = await req.json();
    const { firstName, lastName, email, phone } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: "First name, last name, and email are required" }, { status: 400 });
    }

    await prisma.waitlist.create({
      data: {
        firstName,
        lastName,
        email,
        phone: phone || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[waitlist]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
  });
}
