import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { STUDIOS_ACCESS_INTEREST_OPTIONS } from "@/lib/studios/gateway/interest-options";
import type { StudiosAccessInterestType } from "@/lib/studios/gateway/interest-options";

const schema = z.object({
  sourceRoute: z.string().min(4).max(500),
  attemptedAction: z.string().max(200).optional().nullable(),
  intendedHref: z.string().max(2000).optional().nullable(),
  fullName: z.string().min(2).max(120),
  email: z.string().email().max(320),
  phone: z.string().max(40).optional().nullable(),
  interestType: z
    .string()
    .refine((v): v is StudiosAccessInterestType =>
      (STUDIOS_ACCESS_INTEREST_OPTIONS as readonly string[]).includes(v),
    ),
  note: z.string().max(8000).optional().nullable(),
  visitorType: z.enum(["authenticated", "invited", "public_unknown"]).default("public_unknown"),
  referrer: z.string().max(2000).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;

    const row = await prisma.studiosGatewayAccessRequest.create({
      data: {
        status: "new",
        sourceRoute: d.sourceRoute,
        attemptedAction: d.attemptedAction ?? undefined,
        intendedHref: d.intendedHref ?? undefined,
        fullName: d.fullName.trim(),
        email: d.email.trim().toLowerCase(),
        phone: d.phone?.trim() || undefined,
        interestType: d.interestType,
        note: d.note?.trim() || undefined,
        visitorType: d.visitorType,
        referrer: d.referrer ? d.referrer.slice(0, 2000) : undefined,
      },
    });

    return NextResponse.json({ success: true, id: row.id });
  } catch (err) {
    console.error("[api/studios/gateway/access-request]", err);
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
  }
}
